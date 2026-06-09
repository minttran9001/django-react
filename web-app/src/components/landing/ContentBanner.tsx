import courtBooking from "@/assets/images/carousel-courtbooking.webp";
import eventsBooking from "@/assets/images/carousel-eventsbooking.webp";
import facilityBooking from "@/assets/images/carousel-facilitybooking.webp";
import hallBooking from "@/assets/images/carousel-hallbooking.webp";

import { BannerSlider, type BannerSlide } from "./BannerSlider";

const slides: BannerSlide[] = [
  {
    backgroundImage: courtBooking,
    title: "Court Booking",
    description: "Book your favorite court and enjoy your game",
    primaryLabel: "Explore",
    primaryHref: "/login",
    secondaryLabel: "Book a demo",
    secondaryHref: "/register",
  },
  {
    backgroundImage: eventsBooking,
    title: "Events Booking",
    description: "Book your favorite event and enjoy your day",
    primaryLabel: "Explore",
    primaryHref: "/login",
    secondaryLabel: "Book a demo",
    secondaryHref: "/register",
  },
  {
    backgroundImage: facilityBooking,
    title: "Facility Booking",
    description: "Book your favorite facility and enjoy your day",
    primaryLabel: "Explore",
    primaryHref: "/login",
    secondaryLabel: "Book a demo",
    secondaryHref: "/register",
  },
  {
    backgroundImage: hallBooking,
    title: "Hall Booking",
    description: "Book your favorite hall and enjoy your day",
    primaryLabel: "Explore",
    primaryHref: "/login",
    secondaryLabel: "Book a demo",
    secondaryHref: "/register",
  },
];

export function ContentBanner() {
  return (
    <section className="w-full">
      <BannerSlider slides={slides} />
    </section>
  );
}
