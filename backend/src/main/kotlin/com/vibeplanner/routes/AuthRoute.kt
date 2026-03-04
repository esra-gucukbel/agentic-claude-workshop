package com.vibeplanner.routes

import at.favre.lib.crypto.bcrypt.BCrypt
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.vibeplanner.plugins.dataSource
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import java.util.Date

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class LoginResponse(val token: String)

@Serializable
data class ErrorResponse(val error: String)

fun Routing.authRoutes() {
    post("/auth/login") {
        val request = call.receive<LoginRequest>()

        val passwordHash = dataSource.connection.use { conn ->
            conn.prepareStatement("SELECT password_hash FROM users WHERE email = ?").use { stmt ->
                stmt.setString(1, request.email)
                stmt.executeQuery().use { rs ->
                    if (rs.next()) rs.getString("password_hash") else null
                }
            }
        }

        if (passwordHash == null) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Invalid credentials"))
            return@post
        }

        val passwordMatches = BCrypt.verifyer()
            .verify(request.password.toCharArray(), passwordHash)
            .verified

        if (!passwordMatches) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Invalid credentials"))
            return@post
        }

        val secret = application.environment.config.property("jwt.secret").getString()
        val issuer = application.environment.config.property("jwt.issuer").getString()
        val audience = application.environment.config.property("jwt.audience").getString()

        val token = JWT.create()
            .withAudience(audience)
            .withIssuer(issuer)
            .withClaim("email", request.email)
            .withExpiresAt(Date(System.currentTimeMillis() + 86_400_000L))
            .sign(Algorithm.HMAC256(secret))

        call.respond(HttpStatusCode.OK, LoginResponse(token))
    }
}
