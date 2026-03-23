package com.vibeplanner.routes

import com.vibeplanner.plugins.withConnection
import io.ktor.http.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import java.sql.Connection

@Serializable
data class WaypointDto(
    val id: Int,
    val tourId: Int,
    val title: String,
    val description: String,
    val lat: Double,
    val lng: Double,
    val position: Int
)

@Serializable
data class TourDto(
    val id: Int,
    val title: String,
    val description: String,
    val createdAt: String,
    val waypoints: List<WaypointDto> = emptyList()
)

@Serializable
data class CreateTourRequest(val title: String, val description: String = "")

@Serializable
data class UpdateTourRequest(val title: String, val description: String = "")

@Serializable
data class CreateWaypointRequest(
    val title: String,
    val description: String = "",
    val lat: Double,
    val lng: Double,
    val position: Int = 0
)

@Serializable
data class UpdateWaypointRequest(
    val title: String,
    val description: String = "",
    val lat: Double,
    val lng: Double,
    val position: Int = 0
)

@Serializable
data class SuccessResponse(val success: Boolean)

private fun getUserId(conn: Connection, email: String): Int? =
    conn.prepareStatement("SELECT id FROM users WHERE email = ?").use { stmt ->
        stmt.setString(1, email)
        stmt.executeQuery().use { rs -> if (rs.next()) rs.getInt("id") else null }
    }

fun Routing.tourRoutes() {
    authenticate("auth-jwt") {
        route("/tours") {
            get {
                val email = call.principal<JWTPrincipal>()!!.payload.getClaim("email").asString()
                val tours = withConnection { conn ->
                    val userId = getUserId(conn, email) ?: return@withConnection emptyList<TourDto>()
                    val result = mutableListOf<TourDto>()
                    conn.prepareStatement(
                        "SELECT id, title, description, created_at FROM tours WHERE user_id = ? ORDER BY created_at DESC"
                    ).use { stmt ->
                        stmt.setInt(1, userId)
                        stmt.executeQuery().use { rs ->
                            while (rs.next()) result.add(
                                TourDto(
                                    id = rs.getInt("id"),
                                    title = rs.getString("title"),
                                    description = rs.getString("description") ?: "",
                                    createdAt = rs.getTimestamp("created_at").toString()
                                )
                            )
                        }
                    }
                    result
                }
                call.respond(HttpStatusCode.OK, tours)
            }

            post {
                val email = call.principal<JWTPrincipal>()!!.payload.getClaim("email").asString()
                val request = call.receive<CreateTourRequest>()
                val tour = withConnection { conn ->
                    val userId = getUserId(conn, email) ?: return@withConnection null
                    conn.prepareStatement(
                        "INSERT INTO tours (user_id, title, description) VALUES (?, ?, ?) RETURNING id, title, description, created_at"
                    ).use { stmt ->
                        stmt.setInt(1, userId)
                        stmt.setString(2, request.title)
                        stmt.setString(3, request.description)
                        stmt.executeQuery().use { rs ->
                            if (rs.next()) TourDto(
                                id = rs.getInt("id"),
                                title = rs.getString("title"),
                                description = rs.getString("description") ?: "",
                                createdAt = rs.getTimestamp("created_at").toString()
                            ) else null
                        }
                    }
                }
                if (tour == null) {
                    call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to create tour"))
                    return@post
                }
                call.respond(HttpStatusCode.Created, tour)
            }

            route("/{id}") {
                get {
                    val email = call.principal<JWTPrincipal>()!!.payload.getClaim("email").asString()
                    val tourId = call.parameters["id"]?.toIntOrNull()
                        ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour ID"))

                    val tour = withConnection { conn ->
                        val userId = getUserId(conn, email) ?: return@withConnection null
                        val tourDto = conn.prepareStatement(
                            "SELECT id, title, description, created_at FROM tours WHERE id = ? AND user_id = ?"
                        ).use { stmt ->
                            stmt.setInt(1, tourId)
                            stmt.setInt(2, userId)
                            stmt.executeQuery().use { rs ->
                                if (rs.next()) TourDto(
                                    id = rs.getInt("id"),
                                    title = rs.getString("title"),
                                    description = rs.getString("description") ?: "",
                                    createdAt = rs.getTimestamp("created_at").toString()
                                ) else null
                            }
                        } ?: return@withConnection null

                        val waypoints = mutableListOf<WaypointDto>()
                        conn.prepareStatement(
                            "SELECT id, title, description, lat, lng, position FROM tour_waypoints WHERE tour_id = ? ORDER BY position, id"
                        ).use { stmt ->
                            stmt.setInt(1, tourId)
                            stmt.executeQuery().use { rs ->
                                while (rs.next()) waypoints.add(
                                    WaypointDto(
                                        id = rs.getInt("id"),
                                        tourId = tourId,
                                        title = rs.getString("title"),
                                        description = rs.getString("description") ?: "",
                                        lat = rs.getDouble("lat"),
                                        lng = rs.getDouble("lng"),
                                        position = rs.getInt("position")
                                    )
                                )
                            }
                        }
                        tourDto.copy(waypoints = waypoints)
                    }

                    if (tour == null) {
                        call.respond(HttpStatusCode.NotFound, ErrorResponse("Tour not found"))
                        return@get
                    }
                    call.respond(HttpStatusCode.OK, tour)
                }

                put {
                    val email = call.principal<JWTPrincipal>()!!.payload.getClaim("email").asString()
                    val tourId = call.parameters["id"]?.toIntOrNull()
                        ?: return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour ID"))
                    val request = call.receive<UpdateTourRequest>()

                    val updated = withConnection { conn ->
                        val userId = getUserId(conn, email) ?: return@withConnection false
                        conn.prepareStatement(
                            "UPDATE tours SET title = ?, description = ?, updated_at = NOW() WHERE id = ? AND user_id = ?"
                        ).use { stmt ->
                            stmt.setString(1, request.title)
                            stmt.setString(2, request.description)
                            stmt.setInt(3, tourId)
                            stmt.setInt(4, userId)
                            stmt.executeUpdate() > 0
                        }
                    }

                    if (!updated) {
                        call.respond(HttpStatusCode.NotFound, ErrorResponse("Tour not found"))
                        return@put
                    }
                    call.respond(HttpStatusCode.OK, SuccessResponse(true))
                }

                delete {
                    val email = call.principal<JWTPrincipal>()!!.payload.getClaim("email").asString()
                    val tourId = call.parameters["id"]?.toIntOrNull()
                        ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour ID"))

                    val deleted = withConnection { conn ->
                        val userId = getUserId(conn, email) ?: return@withConnection false
                        conn.prepareStatement(
                            "DELETE FROM tours WHERE id = ? AND user_id = ?"
                        ).use { stmt ->
                            stmt.setInt(1, tourId)
                            stmt.setInt(2, userId)
                            stmt.executeUpdate() > 0
                        }
                    }

                    if (!deleted) {
                        call.respond(HttpStatusCode.NotFound, ErrorResponse("Tour not found"))
                        return@delete
                    }
                    call.respond(HttpStatusCode.OK, SuccessResponse(true))
                }

                route("/waypoints") {
                    post {
                        val email = call.principal<JWTPrincipal>()!!.payload.getClaim("email").asString()
                        val tourId = call.parameters["id"]?.toIntOrNull()
                            ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour ID"))
                        val request = call.receive<CreateWaypointRequest>()

                        val waypoint = withConnection { conn ->
                            val userId = getUserId(conn, email) ?: return@withConnection null
                            val tourExists = conn.prepareStatement(
                                "SELECT id FROM tours WHERE id = ? AND user_id = ?"
                            ).use { stmt ->
                                stmt.setInt(1, tourId)
                                stmt.setInt(2, userId)
                                stmt.executeQuery().use { rs -> rs.next() }
                            }
                            if (!tourExists) return@withConnection null

                            conn.prepareStatement(
                                "INSERT INTO tour_waypoints (tour_id, title, description, lat, lng, position) VALUES (?, ?, ?, ?, ?, ?) RETURNING id, title, description, lat, lng, position"
                            ).use { stmt ->
                                stmt.setInt(1, tourId)
                                stmt.setString(2, request.title)
                                stmt.setString(3, request.description)
                                stmt.setDouble(4, request.lat)
                                stmt.setDouble(5, request.lng)
                                stmt.setInt(6, request.position)
                                stmt.executeQuery().use { rs ->
                                    if (rs.next()) WaypointDto(
                                        id = rs.getInt("id"),
                                        tourId = tourId,
                                        title = rs.getString("title"),
                                        description = rs.getString("description") ?: "",
                                        lat = rs.getDouble("lat"),
                                        lng = rs.getDouble("lng"),
                                        position = rs.getInt("position")
                                    ) else null
                                }
                            }
                        }

                        if (waypoint == null) {
                            call.respond(HttpStatusCode.NotFound, ErrorResponse("Tour not found"))
                            return@post
                        }
                        call.respond(HttpStatusCode.Created, waypoint)
                    }

                    route("/{waypointId}") {
                        put {
                            val email = call.principal<JWTPrincipal>()!!.payload.getClaim("email").asString()
                            val tourId = call.parameters["id"]?.toIntOrNull()
                                ?: return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour ID"))
                            val waypointId = call.parameters["waypointId"]?.toIntOrNull()
                                ?: return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid waypoint ID"))
                            val request = call.receive<UpdateWaypointRequest>()

                            val updated = withConnection { conn ->
                                val userId = getUserId(conn, email) ?: return@withConnection false
                                conn.prepareStatement(
                                    "UPDATE tour_waypoints SET title = ?, description = ?, lat = ?, lng = ?, position = ? WHERE id = ? AND tour_id IN (SELECT id FROM tours WHERE id = ? AND user_id = ?)"
                                ).use { stmt ->
                                    stmt.setString(1, request.title)
                                    stmt.setString(2, request.description)
                                    stmt.setDouble(3, request.lat)
                                    stmt.setDouble(4, request.lng)
                                    stmt.setInt(5, request.position)
                                    stmt.setInt(6, waypointId)
                                    stmt.setInt(7, tourId)
                                    stmt.setInt(8, userId)
                                    stmt.executeUpdate() > 0
                                }
                            }

                            if (!updated) {
                                call.respond(HttpStatusCode.NotFound, ErrorResponse("Waypoint not found"))
                                return@put
                            }
                            call.respond(HttpStatusCode.OK, SuccessResponse(true))
                        }

                        delete {
                            val email = call.principal<JWTPrincipal>()!!.payload.getClaim("email").asString()
                            val tourId = call.parameters["id"]?.toIntOrNull()
                                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour ID"))
                            val waypointId = call.parameters["waypointId"]?.toIntOrNull()
                                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid waypoint ID"))

                            val deleted = withConnection { conn ->
                                val userId = getUserId(conn, email) ?: return@withConnection false
                                conn.prepareStatement(
                                    "DELETE FROM tour_waypoints WHERE id = ? AND tour_id IN (SELECT id FROM tours WHERE id = ? AND user_id = ?)"
                                ).use { stmt ->
                                    stmt.setInt(1, waypointId)
                                    stmt.setInt(2, tourId)
                                    stmt.setInt(3, userId)
                                    stmt.executeUpdate() > 0
                                }
                            }

                            if (!deleted) {
                                call.respond(HttpStatusCode.NotFound, ErrorResponse("Waypoint not found"))
                                return@delete
                            }
                            call.respond(HttpStatusCode.OK, SuccessResponse(true))
                        }
                    }
                }
            }
        }
    }
}
