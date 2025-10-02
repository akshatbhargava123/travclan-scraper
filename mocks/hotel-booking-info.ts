import hotelBookingInfoSuccessResponse from "./json/hotel-booking-info-success-response.json" with { type: "json" };
import hotelBookingInfoErrorResponse from "./json/hotel-booking-info-error-response.json" with { type: "json" };

export const hotelBookingInfoRequestMock = {
    hotelId: "39713834",
    organizationCode: "orfov6",
    checkIn: "2025-10-01",
    checkOut: "2025-10-02",
    occupancies: [{ numOfAdults: 2, childAges: [] }],
    nationality: "IN",
    currency: "INR"
};

export type HotelBookingInfoErrorResponse = typeof hotelBookingInfoErrorResponse;

export type HotelBookingInfoSuccessResponse = typeof hotelBookingInfoSuccessResponse;

export type HotelBookingInfoRequest = typeof hotelBookingInfoRequestMock;

export type HotelBookingInfo = HotelBookingInfoSuccessResponse["results"][0]["data"][0];