package com.vibeplanner.routes

import com.vibeplanner.BaseRouteTest
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class AuthRouteTest : BaseRouteTest() {

    @Test
    fun `POST auth login with valid credentials returns 200 and token`() = withTestApp {
        val response = client.post("/auth/login") {
            contentType(ContentType.Application.Json)
            setBody("""{"username":"test","password":"V1b3Pl@nn3r!"}""")
        }
        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertTrue(body.contains("token"), "Response should contain a token field")
        assertTrue(body.length > 20, "Token should be non-empty")
    }

    @Test
    fun `POST auth login with wrong password returns 401`() = withTestApp {
        val response = client.post("/auth/login") {
            contentType(ContentType.Application.Json)
            setBody("""{"username":"test","password":"wrongpassword"}""")
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `POST auth login with unknown username returns 401`() = withTestApp {
        val response = client.post("/auth/login") {
            contentType(ContentType.Application.Json)
            setBody("""{"username":"nobody","password":"test"}""")
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `POST auth login with empty body returns 400`() = withTestApp {
        val response = client.post("/auth/login") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
    }
}
