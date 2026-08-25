"""Seed host accounts with published court-center listings."""

from datetime import time
from decimal import Decimal

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Court, CourtCenter, CourtSchedule, Image, Sport, UserProfile
from api.utils.slot_index import regenerate_slots_for_court

DEFAULT_PASSWORD = "SeedPass123!"

# Existing Cloudinary assets already allowed by next.config.ts
IMAGE_URLS = [
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781030228/court-booking/pending/2/iydk8q4tuydbvitoljkd.webp",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781030405/court-booking/pending/2/yy2pcs7qoz8zxrfgsvex.webp",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781030602/court-booking/pending/2/yaahy6nq0euoyquwooys.webp",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781030607/court-booking/pending/2/jd7ypp7wl2aeqk4s1eag.webp",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781030610/court-booking/pending/2/n4wwjn5zwb3wewctojrd.webp",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781031931/court-booking/pending/2/nlbp1boeaqwojasbzelt.webp",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781031935/court-booking/pending/2/xnucqnjv9lhehymfu9jc.webp",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781105227/court-booking/pending/2/tu0zrqct6gcge8t8kxel.webp",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781105232/court-booking/pending/2/ddnvpprq3vdb6muintez.webp",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781105396/court-booking/pending/2/n7mrb5h0ec5tisbuj6ry.webp",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781020326/court-booking/pending/2/p1emoqkpqqfgsneupnau.jpg",
    "https://res.cloudinary.com/mint-twitter-clone/image/upload/v1781030065/court-booking/pending/2/cc8frkwsa5znhkokmphi.webp",
]


def _weekday_hours(start: time, end: time, days: range | list[int] | None = None) -> list[dict]:
    day_values = list(days) if days is not None else list(range(7))
    return [
        {"day_of_week": day, "start_time": start, "end_time": end}
        for day in day_values
    ]


SEED_ACCOUNTS = [
    {
        "email": "an.nguyen@courts.example",
        "name": "An Nguyen",
        "phone_number": "+84 901 111 222",
        "address": "District 1, Ho Chi Minh City",
        "listings": [
            {
                "title": "Saigon Lawn Tennis Club",
                "description": (
                    "Two well-kept hard courts in the heart of District 1. "
                    "Floodlights, seating, and rackets available to rent."
                ),
                "address": "12 Nguyen Hue, Ben Nghe, District 1, Ho Chi Minh City",
                "latitude": Decimal("10.776889"),
                "longitude": Decimal("106.700806"),
                "review_count": 18,
                "review_average_rating": Decimal("4.70"),
                "image_offset": 0,
                "courts": [
                    {
                        "sport": "tennis",
                        "title": "Court 1 — Center",
                        "description": "Championship hard court with spectator seating.",
                        "price_per_hour": Decimal("280000"),
                        "schedules": _weekday_hours(time(6, 0), time(22, 0)),
                    },
                    {
                        "sport": "tennis",
                        "title": "Court 2 — Garden",
                        "description": "Quiet garden court, ideal for lessons.",
                        "price_per_hour": Decimal("250000"),
                        "schedules": _weekday_hours(time(6, 0), time(21, 0)),
                    },
                ],
            },
            {
                "title": "Riverside Pickleball Yard",
                "description": (
                    "Open-air pickleball courts along the Saigon River. "
                    "Cool evening breeze and plenty of parking."
                ),
                "address": "88 Ton Duc Thang, District 1, Ho Chi Minh City",
                "latitude": Decimal("10.777540"),
                "longitude": Decimal("106.706210"),
                "review_count": 9,
                "review_average_rating": Decimal("4.40"),
                "image_offset": 3,
                "courts": [
                    {
                        "sport": "pickleball",
                        "title": "Pickleball A",
                        "description": "Outdoor court with new nets and LED lighting.",
                        "price_per_hour": Decimal("160000"),
                        "schedules": _weekday_hours(time(7, 0), time(21, 0)),
                    },
                    {
                        "sport": "pickleball",
                        "title": "Pickleball B",
                        "description": "Adjacent outdoor court for doubles play.",
                        "price_per_hour": Decimal("160000"),
                        "schedules": _weekday_hours(time(7, 0), time(21, 0)),
                    },
                ],
            },
        ],
    },
    {
        "email": "bao.le@courts.example",
        "name": "Bao Le",
        "phone_number": "+84 902 333 444",
        "address": "Thu Duc City, Ho Chi Minh City",
        "listings": [
            {
                "title": "Thu Duc Badminton Hall",
                "description": (
                    "Air-conditioned indoor hall with sprung wooden floors. "
                    "Showers, lockers, and a small cafe on site."
                ),
                "address": "45 Vo Van Ngan, Linh Chieu, Thu Duc, Ho Chi Minh City",
                "latitude": Decimal("10.850598"),
                "longitude": Decimal("106.771545"),
                "review_count": 32,
                "review_average_rating": Decimal("4.85"),
                "image_offset": 6,
                "courts": [
                    {
                        "sport": "badminton",
                        "title": "Court A",
                        "description": "Tournament-standard indoor court.",
                        "price_per_hour": Decimal("90000"),
                        "schedules": _weekday_hours(time(6, 0), time(22, 0), range(6)),
                    },
                    {
                        "sport": "badminton",
                        "title": "Court B",
                        "description": "Indoor court next to the cafe.",
                        "price_per_hour": Decimal("85000"),
                        "schedules": _weekday_hours(time(6, 0), time(22, 0), range(6)),
                    },
                    {
                        "sport": "badminton",
                        "title": "Court C",
                        "description": "Weekend-friendly court with extra lighting.",
                        "price_per_hour": Decimal("85000"),
                        "schedules": _weekday_hours(time(7, 0), time(20, 0), [5, 6])
                        + _weekday_hours(time(6, 0), time(22, 0), range(5)),
                    },
                ],
            },
        ],
    },
    {
        "email": "chi.pham@courts.example",
        "name": "Chi Pham",
        "phone_number": "+84 903 555 666",
        "address": "District 7, Ho Chi Minh City",
        "listings": [
            {
                "title": "Crescent Sports Complex",
                "description": (
                    "Multi-sport venue in Phu My Hung: basketball, football 5-a-side, "
                    "and volleyball. Changing rooms and on-site parking."
                ),
                "address": "101 Nguyen Van Linh, Tan Phu, District 7, Ho Chi Minh City",
                "latitude": Decimal("10.729245"),
                "longitude": Decimal("106.721647"),
                "review_count": 24,
                "review_average_rating": Decimal("4.55"),
                "image_offset": 8,
                "courts": [
                    {
                        "sport": "basketball",
                        "title": "Full Court",
                        "description": "Outdoor full court with glass backboards.",
                        "price_per_hour": Decimal("220000"),
                        "schedules": _weekday_hours(time(6, 0), time(22, 0)),
                    },
                    {
                        "sport": "football",
                        "title": "5-a-side Pitch",
                        "description": "Artificial turf pitch with floodlights.",
                        "price_per_hour": Decimal("450000"),
                        "schedules": _weekday_hours(time(7, 0), time(23, 0)),
                    },
                    {
                        "sport": "volleyball",
                        "title": "Sand Court",
                        "description": "Beach volleyball court with net and lines.",
                        "price_per_hour": Decimal("180000"),
                        "schedules": _weekday_hours(time(8, 0), time(21, 0), [4, 5, 6])
                        + _weekday_hours(time(16, 0), time(21, 0), range(4)),
                    },
                ],
            },
        ],
    },
]


def _ensure_user(account: dict, password: str) -> tuple[User, bool]:
    user, created = User.objects.get_or_create(
        username=account["email"],
        defaults={
            "email": account["email"],
            "is_active": True,
        },
    )
    if not created:
        user.email = account["email"]
        user.is_active = True
        user.save(update_fields=["email", "is_active"])
    user.set_password(password)
    user.save(update_fields=["password"])

    profile = UserProfile.for_user(user)
    profile.name = account["name"]
    profile.phone_number = account["phone_number"]
    profile.address = account["address"]
    if profile.avatar_id is None:
        avatar = Image.objects.create(
            owner=user,
            url=IMAGE_URLS[hash(account["email"]) % len(IMAGE_URLS)],
            public_id="",
            kind=None,
        )
        profile.avatar = avatar
    profile.save()
    return user, created


def _attach_images(owner: User, obj, *, logo_url: str, gallery_urls: list[str]) -> None:
    content_type = ContentType.objects.get_for_model(obj)
    Image.objects.filter(content_type=content_type, object_id=obj.id).delete()

    Image.objects.create(
        owner=owner,
        content_type=content_type,
        object_id=obj.id,
        url=logo_url,
        kind=Image.Kind.LOGO,
        sort_order=0,
    )
    for index, url in enumerate(gallery_urls):
        Image.objects.create(
            owner=owner,
            content_type=content_type,
            object_id=obj.id,
            url=url,
            kind=Image.Kind.GALLERY,
            sort_order=index,
        )


def _ensure_listing(owner: User, sports: dict[str, Sport], listing: dict) -> CourtCenter:
    center, _ = CourtCenter.objects.get_or_create(
        owner=owner,
        title=listing["title"],
        defaults={
            "description": listing["description"],
            "address": listing["address"],
            "latitude": listing["latitude"],
            "longitude": listing["longitude"],
            "status": CourtCenter.Status.PUBLISHED,
            "review_count": listing["review_count"],
            "review_average_rating": listing["review_average_rating"],
        },
    )
    center.description = listing["description"]
    center.address = listing["address"]
    center.latitude = listing["latitude"]
    center.longitude = listing["longitude"]
    center.status = CourtCenter.Status.PUBLISHED
    center.review_count = listing["review_count"]
    center.review_average_rating = listing["review_average_rating"]
    center.save()

    offset = listing["image_offset"] % len(IMAGE_URLS)
    logo_url = IMAGE_URLS[offset]
    gallery_urls = [
        IMAGE_URLS[(offset + 1) % len(IMAGE_URLS)],
        IMAGE_URLS[(offset + 2) % len(IMAGE_URLS)],
    ]
    _attach_images(owner, center, logo_url=logo_url, gallery_urls=gallery_urls)

    kept_court_ids: list[int] = []
    for index, court_data in enumerate(listing["courts"]):
        sport = sports[court_data["sport"]]
        court = (
            Court.objects.filter(center=center, title=court_data["title"]).first()
            or Court.objects.create(
                center=center,
                sport=sport,
                title=court_data["title"],
            )
        )
        court.sport = sport
        court.description = court_data["description"]
        court.price_per_hour = court_data["price_per_hour"]
        court.price_currency = "VND"
        court.save()
        kept_court_ids.append(court.id)

        court.schedules.all().delete()
        CourtSchedule.objects.bulk_create(
            [
                CourtSchedule(court=court, **schedule)
                for schedule in court_data["schedules"]
            ]
        )
        court_image_url = IMAGE_URLS[(offset + 3 + index) % len(IMAGE_URLS)]
        _attach_images(owner, court, logo_url=court_image_url, gallery_urls=[court_image_url])
        regenerate_slots_for_court(court)

    center.courts.exclude(id__in=kept_court_ids).delete()
    return center


class Command(BaseCommand):
    help = "Seed a few host accounts, each with published listings, courts, and bookable slots"

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=DEFAULT_PASSWORD,
            help=f"Password for seeded accounts (default: {DEFAULT_PASSWORD})",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]
        sports = {sport.code: sport for sport in Sport.objects.all()}
        missing = {
            code
            for account in SEED_ACCOUNTS
            for listing in account["listings"]
            for court in listing["courts"]
            if (code := court["sport"]) not in sports
        }
        if missing:
            raise CommandError(
                f"Missing sports in the database: {', '.join(sorted(missing))}. "
                "Run migrations first."
            )

        created_users = 0
        listing_count = 0
        court_count = 0

        for account in SEED_ACCOUNTS:
            user, created = _ensure_user(account, password)
            if created:
                created_users += 1
            for listing in account["listings"]:
                center = _ensure_listing(user, sports, listing)
                listing_count += 1
                court_count += center.courts.count()
                self.stdout.write(
                    f"  {user.email} → {center.title} "
                    f"({center.courts.count()} courts, status={center.status})"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created_users} new account(s), {listing_count} published listing(s), "
                f"{court_count} court(s). Login password: {password}"
            )
        )
        self.stdout.write("Accounts:")
        for account in SEED_ACCOUNTS:
            self.stdout.write(f"  {account['email']}  ({account['name']})")
