package com.vibeplanner.routes

import com.vibeplanner.BaseRouteTest
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.json.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class TourRouteTest : BaseRouteTest() {

    private suspend fun io.ktor.server.testing.ApplicationTestBuilder.loginAndGetToken(): String {
        val response = client.post("/auth/login") {
            contentType(ContentType.Application.Json)
            setBody("""{"email":"test@vibeplanner.com","password":"V1b3Pl@nn3r!"}""")
        }
        val body = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        return body["token"]!!.jsonPrimitive.content
    }

    @Test
    fun `GET tours without auth returns 401`() = withTestApp {
        val response = client.get("/tours")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `GET tours with auth returns 200 and list`() = withTestApp {
        val token = loginAndGetToken()
        val response = client.get("/tours") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }
        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertTrue(body.startsWith("["), "Response should be a JSON array")
    }

    @Test
    fun `POST tours creates a tour and returns 201`() = withTestApp {
        val token = loginAndGetToken()
        val response = client.post("/tours") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"tourNumber":"0001","vehicleType":"SPRINTER_3_5T","maxVolume":14.0,"maxWeight":3500.0,"rangeKm":200}""")
        }
        assertEquals(HttpStatusCode.Created, response.status)
        val body = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        assertEquals("0001", body["tourNumber"]!!.jsonPrimitive.content)
        assertEquals("SPRINTER_3_5T", body["vehicleType"]!!.jsonPrimitive.content)
    }

    @Test
    fun `POST tours with invalid tour number returns 400`() = withTestApp {
        val token = loginAndGetToken()
        val response = client.post("/tours") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"tourNumber":"AB","vehicleType":"SPRINTER_3_5T","maxVolume":14.0,"maxWeight":3500.0,"rangeKm":200}""")
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `POST tours with invalid vehicle type returns 400`() = withTestApp {
        val token = loginAndGetToken()
        val response = client.post("/tours") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"tourNumber":"0002","vehicleType":"INVALID_TYPE","maxVolume":14.0,"maxWeight":3500.0,"rangeKm":200}""")
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `PUT tours updates a tour`() = withTestApp {
        val token = loginAndGetToken()
        val created = client.post("/tours") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"tourNumber":"0003","vehicleType":"CARGO_BIKE","maxVolume":1.5,"maxWeight":100.0,"rangeKm":50}""")
        }
        val id = Json.parseToJsonElement(created.bodyAsText()).jsonObject["id"]!!.jsonPrimitive.int

        val updated = client.put("/tours/$id") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"tourNumber":"0003","vehicleType":"BOX_TRUCK_7_5T","maxVolume":30.0,"maxWeight":7500.0,"rangeKm":400}""")
        }
        assertEquals(HttpStatusCode.OK, updated.status)
        val body = Json.parseToJsonElement(updated.bodyAsText()).jsonObject
        assertEquals("BOX_TRUCK_7_5T", body["vehicleType"]!!.jsonPrimitive.content)
    }

    @Test
    fun `DELETE tours removes a tour`() = withTestApp {
        val token = loginAndGetToken()
        val created = client.post("/tours") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"tourNumber":"0004","vehicleType":"SPRINTER_5_5T","maxVolume":20.0,"maxWeight":5500.0,"rangeKm":300}""")
        }
        val id = Json.parseToJsonElement(created.bodyAsText()).jsonObject["id"]!!.jsonPrimitive.int

        val deleted = client.delete("/tours/$id") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }
        assertEquals(HttpStatusCode.NoContent, deleted.status)
    }

    @Test
    fun `GET waypoints returns empty list for tour with no waypoints`() = withTestApp {
        val token = loginAndGetToken()
        val created = client.post("/tours") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"tourNumber":"0005","vehicleType":"CARGO_BIKE","maxVolume":1.5,"maxWeight":100.0,"rangeKm":50}""")
        }
        val id = Json.parseToJsonElement(created.bodyAsText()).jsonObject["id"]!!.jsonPrimitive.int

        val response = client.get("/tours/$id/waypoints") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }
        assertEquals(HttpStatusCode.OK, response.status)
        val body = Json.parseToJsonElement(response.bodyAsText()).jsonArray
        assertEquals(0, body.size)
    }

    @Test
    fun `GET waypoints returns 404 for a tour the user does not own`() = withTestApp {
        val response = client.get("/tours/99999/waypoints") {
            header(HttpHeaders.Authorization, "Bearer ${loginAndGetToken()}")
        }
        assertEquals(HttpStatusCode.NotFound, response.status)
    }

    @Test
    fun `PUT waypoints saves and returns waypoints`() = withTestApp {
        val token = loginAndGetToken()
        val created = client.post("/tours") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"tourNumber":"0006","vehicleType":"SPRINTER_3_5T","maxVolume":14.0,"maxWeight":3500.0,"rangeKm":200}""")
        }
        val id = Json.parseToJsonElement(created.bodyAsText()).jsonObject["id"]!!.jsonPrimitive.int

        val response = client.put("/tours/$id/waypoints") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""[{"lat":53.5,"lng":10.0},{"lat":52.5,"lng":13.4}]""")
        }
        assertEquals(HttpStatusCode.OK, response.status)
        val body = Json.parseToJsonElement(response.bodyAsText()).jsonArray
        assertEquals(2, body.size)
        assertEquals(53.5, body[0].jsonObject["lat"]!!.jsonPrimitive.double, 0.001)
        assertEquals(52.5, body[1].jsonObject["lat"]!!.jsonPrimitive.double, 0.001)
    }

    @Test
    fun `PUT waypoints replaces existing waypoints`() = withTestApp {
        val token = loginAndGetToken()
        val created = client.post("/tours") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"tourNumber":"0007","vehicleType":"BOX_TRUCK_12T","maxVolume":40.0,"maxWeight":12000.0,"rangeKm":500}""")
        }
        val id = Json.parseToJsonElement(created.bodyAsText()).jsonObject["id"]!!.jsonPrimitive.int

        client.put("/tours/$id/waypoints") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""[{"lat":51.0,"lng":9.0},{"lat":50.0,"lng":8.0}]""")
        }

        val replaced = client.put("/tours/$id/waypoints") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""[{"lat":48.0,"lng":11.0}]""")
        }
        assertEquals(HttpStatusCode.OK, replaced.status)
        val body = Json.parseToJsonElement(replaced.bodyAsText()).jsonArray
        assertEquals(1, body.size)
        assertEquals(48.0, body[0].jsonObject["lat"]!!.jsonPrimitive.double, 0.001)
    }

    @Test
    fun `PUT waypoints returns 404 for a tour the user does not own`() = withTestApp {
        val response = client.put("/tours/99999/waypoints") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer ${loginAndGetToken()}")
            setBody("""[{"lat":53.5,"lng":10.0}]""")
        }
        assertEquals(HttpStatusCode.NotFound, response.status)
    }
}
