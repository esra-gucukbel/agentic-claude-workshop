package com.vibeplanner.routes

import io.ktor.http.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable

@Serializable
data class HealthResponse(val status: String, val service: String)

fun Routing.healthRoutes() {
    get("/health") {
        call.respond(HttpStatusCode.OK, HealthResponse("ok", "vibe-planner-backend"))
    }
}
