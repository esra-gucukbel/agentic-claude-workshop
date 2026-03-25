package com.vibeplanner.routes

import com.vibeplanner.plugins.dataSource
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.Route
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable

@Serializable
data class Tour(
    val id: Int,
    val tourNumber: String,
    val vehicleType: String,
    val maxVolume: Double,
    val maxWeight: Double,
    val rangeKm: Int
)

@Serializable
data class TourRequest(
    val tourNumber: String,
    val vehicleType: String,
    val maxVolume: Double,
    val maxWeight: Double,
    val rangeKm: Int
)

val VALID_VEHICLE_TYPES = setOf(
    "CARGO_BIKE",
    "SPRINTER_3_5T",
    "SPRINTER_5_5T",
    "BOX_TRUCK_7_5T",
    "BOX_TRUCK_12T"
)

fun Route.tourRoutes() {
    get("/tours") {
        val principal = call.principal<JWTPrincipal>()!!
        val email = principal.payload.getClaim("email").asString()

        val userId = dataSource.connection.use { conn ->
            conn.prepareStatement("SELECT id FROM users WHERE email = ?").use { stmt ->
                stmt.setString(1, email)
                stmt.executeQuery().use { rs -> if (rs.next()) rs.getInt("id") else null }
            }
        }

        if (userId == null) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("User not found"))
            return@get
        }

        val tours = dataSource.connection.use { conn ->
            conn.prepareStatement(
                "SELECT id, tour_number, vehicle_type, max_volume, max_weight, range_km FROM tours WHERE user_id = ? ORDER BY tour_number"
            ).use { stmt ->
                stmt.setInt(1, userId)
                stmt.executeQuery().use { rs ->
                    val list = mutableListOf<Tour>()
                    while (rs.next()) {
                        list.add(
                            Tour(
                                id = rs.getInt("id"),
                                tourNumber = rs.getString("tour_number").trim(),
                                vehicleType = rs.getString("vehicle_type"),
                                maxVolume = rs.getDouble("max_volume"),
                                maxWeight = rs.getDouble("max_weight"),
                                rangeKm = rs.getInt("range_km")
                            )
                        )
                    }
                    list
                }
            }
        }

        call.respond(HttpStatusCode.OK, tours)
    }

    post("/tours") {
        val principal = call.principal<JWTPrincipal>()!!
        val email = principal.payload.getClaim("email").asString()
        val request = call.receive<TourRequest>()

        if (!request.tourNumber.matches(Regex("\\d{4}"))) {
            call.respond(HttpStatusCode.BadRequest, ErrorResponse("Tour number must be exactly 4 digits"))
            return@post
        }

        if (request.vehicleType !in VALID_VEHICLE_TYPES) {
            call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid vehicle type"))
            return@post
        }

        val userId = dataSource.connection.use { conn ->
            conn.prepareStatement("SELECT id FROM users WHERE email = ?").use { stmt ->
                stmt.setString(1, email)
                stmt.executeQuery().use { rs -> if (rs.next()) rs.getInt("id") else null }
            }
        }

        if (userId == null) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("User not found"))
            return@post
        }

        val tour = dataSource.connection.use { conn ->
            conn.prepareStatement(
                "INSERT INTO tours (user_id, tour_number, vehicle_type, max_volume, max_weight, range_km) VALUES (?, ?, ?, ?, ?, ?) RETURNING id, tour_number, vehicle_type, max_volume, max_weight, range_km"
            ).use { stmt ->
                stmt.setInt(1, userId)
                stmt.setString(2, request.tourNumber)
                stmt.setString(3, request.vehicleType)
                stmt.setBigDecimal(4, request.maxVolume.toBigDecimal())
                stmt.setBigDecimal(5, request.maxWeight.toBigDecimal())
                stmt.setInt(6, request.rangeKm)
                stmt.executeQuery().use { rs ->
                    if (rs.next()) Tour(
                        id = rs.getInt("id"),
                        tourNumber = rs.getString("tour_number").trim(),
                        vehicleType = rs.getString("vehicle_type"),
                        maxVolume = rs.getDouble("max_volume"),
                        maxWeight = rs.getDouble("max_weight"),
                        rangeKm = rs.getInt("range_km")
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

    put("/tours/{id}") {
        val principal = call.principal<JWTPrincipal>()!!
        val email = principal.payload.getClaim("email").asString()
        val tourId = call.parameters["id"]?.toIntOrNull()
            ?: return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour id"))
        val request = call.receive<TourRequest>()

        if (!request.tourNumber.matches(Regex("\\d{4}"))) {
            call.respond(HttpStatusCode.BadRequest, ErrorResponse("Tour number must be exactly 4 digits"))
            return@put
        }

        if (request.vehicleType !in VALID_VEHICLE_TYPES) {
            call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid vehicle type"))
            return@put
        }

        val userId = dataSource.connection.use { conn ->
            conn.prepareStatement("SELECT id FROM users WHERE email = ?").use { stmt ->
                stmt.setString(1, email)
                stmt.executeQuery().use { rs -> if (rs.next()) rs.getInt("id") else null }
            }
        }

        if (userId == null) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("User not found"))
            return@put
        }

        val updated = dataSource.connection.use { conn ->
            conn.prepareStatement(
                "UPDATE tours SET tour_number = ?, vehicle_type = ?, max_volume = ?, max_weight = ?, range_km = ?, updated_at = NOW() WHERE id = ? AND user_id = ? RETURNING id, tour_number, vehicle_type, max_volume, max_weight, range_km"
            ).use { stmt ->
                stmt.setString(1, request.tourNumber)
                stmt.setString(2, request.vehicleType)
                stmt.setBigDecimal(3, request.maxVolume.toBigDecimal())
                stmt.setBigDecimal(4, request.maxWeight.toBigDecimal())
                stmt.setInt(5, request.rangeKm)
                stmt.setInt(6, tourId)
                stmt.setInt(7, userId)
                stmt.executeQuery().use { rs ->
                    if (rs.next()) Tour(
                        id = rs.getInt("id"),
                        tourNumber = rs.getString("tour_number").trim(),
                        vehicleType = rs.getString("vehicle_type"),
                        maxVolume = rs.getDouble("max_volume"),
                        maxWeight = rs.getDouble("max_weight"),
                        rangeKm = rs.getInt("range_km")
                    ) else null
                }
            }
        }

        if (updated == null) {
            call.respond(HttpStatusCode.NotFound, ErrorResponse("Tour not found"))
            return@put
        }

        call.respond(HttpStatusCode.OK, updated)
    }

    delete("/tours/{id}") {
        val principal = call.principal<JWTPrincipal>()!!
        val email = principal.payload.getClaim("email").asString()
        val tourId = call.parameters["id"]?.toIntOrNull()
            ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour id"))

        val userId = dataSource.connection.use { conn ->
            conn.prepareStatement("SELECT id FROM users WHERE email = ?").use { stmt ->
                stmt.setString(1, email)
                stmt.executeQuery().use { rs -> if (rs.next()) rs.getInt("id") else null }
            }
        }

        if (userId == null) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("User not found"))
            return@delete
        }

        val deleted = dataSource.connection.use { conn ->
            conn.prepareStatement("DELETE FROM tours WHERE id = ? AND user_id = ?").use { stmt ->
                stmt.setInt(1, tourId)
                stmt.setInt(2, userId)
                stmt.executeUpdate()
            }
        }

        if (deleted == 0) {
            call.respond(HttpStatusCode.NotFound, ErrorResponse("Tour not found"))
            return@delete
        }

        call.respond(HttpStatusCode.NoContent)
    }
}
