import { HotelBookingInfo, HotelBookingInfoErrorResponse, HotelBookingInfoRequest, HotelBookingInfoSuccessResponse } from "./mocks/hotel-booking-info.ts";

export class TravclanHotelScraper {

    hotelId: string;

    constructor(hotelId: string) {
        this.hotelId = hotelId;
    }

    async fetchHotelBookingInfo(checkinDate: string, checkoutDate: string): Promise<HotelBookingInfo> {
        const requestBody = {
            hotelId: this.hotelId,
            organizationCode: "orfov6",
            checkIn: checkinDate,
            checkOut: checkoutDate,
            occupancies: [{ numOfAdults: 2, childAges: [] }],
            nationality: "IN",
            currency: "INR"
        } as HotelBookingInfoRequest;

        const res = await fetch("https://hotels-v1.travclan.com/api/v1/hotels/itineraries/", {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en-GB;q=0.9,en;q=0.8,hi;q=0.7",
                "authorization": `Bearer ${Deno.env.get("TRAVCLAN_AUTH_TOKEN")}`,
                "authorization-mode": "AWSCognito",
                "content-type": "application/json",
                "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "source": "website",
                "Referer": "https://www.travclan.com/"
            },
            "body": JSON.stringify(requestBody),
            "method": "POST"
        });

        const json = await res.json() as (HotelBookingInfoSuccessResponse & HotelBookingInfoErrorResponse);

        if (json.error) {
            throw new Error(`Error fetching hotel booking info: ${checkinDate} to ${checkoutDate}: ${json.error.errors.join(", ")}`);
        }

        return json.results?.[0]?.data?.[0];
    }
}