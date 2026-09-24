// Mock data for Guest Companion UI development
// Designed to be easily replaced by GET /api/guest/me once backend contract lands

export const mockGuestData = {
  guest: {
    name: "Rahul Sharma"
  },
  property: {
    name: "Mountain View Homestay",
    location: "Darjeeling, West Bengal",
    village: "Tukvar",
    hostName: "Mrs. Sharma",
    hostPhone: "+91 9876543210"
  },
  stay: {
    room: "Room 203",
    roomType: "Deluxe Room",
    checkIn: "24 Sep 2026",
    checkOut: "27 Sep 2026"
  },
  wifi: {
    ssid: "MountainView_5G",
    password: "welcome123"
  }
};

export default mockGuestData;
