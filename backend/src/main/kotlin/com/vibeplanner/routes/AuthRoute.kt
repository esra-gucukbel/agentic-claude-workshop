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

        data class UserRow(val passwordHash: String, val fullName: String)

        val user = dataSource.connection.use { conn ->
            conn.prepareStatement("SELECT password_hash, full_name FROM users WHERE email = ?").use { stmt ->
                stmt.setString(1, request.email)
                stmt.executeQuery().use { rs ->
                    if (rs.next()) UserRow(rs.getString("password_hash"), rs.getString("full_name")) else null
                }
            }
        }

        if (user == null) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Invalid credentials"))
            return@post
        }

        val passwordMatches = BCrypt.verifyer()
            .verify(request.password.toCharArray(), user.passwordHash)
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
            .withClaim("full_name", user.fullName)
            .withExpiresAt(Date(System.currentTimeMillis() + 86_400_000L))
            .sign(Algorithm.HMAC256(secret))

        call.respond(HttpStatusCode.OK, LoginResponse(token))
    }
}
