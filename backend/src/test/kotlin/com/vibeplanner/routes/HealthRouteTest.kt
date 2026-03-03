package com.vibeplanner.routes

import com.vibeplanner.BaseRouteTest
import io.ktor.client.request.*
import io.ktor.http.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class HealthRouteTest : BaseRouteTest() {

    @Test
    fun `GET health returns 200`() = withTestApp {
        val response = client.get("/health")
        assertEquals(HttpStatusCode.OK, response.status)
    }
}
