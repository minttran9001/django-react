"""Seed many published listings across Vietnam so the search page has real data.

Every seeded center gets the full relation chain the search + detail pages read:
host user -> profile -> avatar, center -> logo + gallery, courts -> sport +
gallery + schedules -> bookable slots.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import (
    Court,
    CourtCenter,
    CourtSchedule,
    CourtSlot,
    Image,
    Sport,
    UserProfile,
)
from api.utils.slot_index import (
    _generate_slots_from_schedules as generate_slots_from_schedules,
)

from .seed_listings import DEFAULT_PASSWORD, IMAGE_URLS

HOST_EMAIL_DOMAIN = "search-hosts.example"
HOST_NAMES = [
    "An Nguyen Van",
    "Bao Tran Minh",
    "Chi Le Thu",
    "Dung Pham Quoc",
    "Giang Do Thuy",
    "Hieu Vu Trung",
    "Khanh Bui Nhat",
    "Lan Hoang Kim",
    "My Dang Tra",
    "Nam Ngo Hai",
    "Oanh Ly Bich",
    "Phuc Ta Dinh",
]


@dataclass(frozen=True)
class Area:
    city: str
    district: str
    street: str
    lat: float
    lng: float


AREAS = [
    Area("Ho Chi Minh City", "District 1", "Nguyen Thi Minh Khai", 10.7769, 106.7009),
    Area("Ho Chi Minh City", "District 3", "Cach Mang Thang Tam", 10.7826, 106.6875),
    Area("Ho Chi Minh City", "District 5", "Tran Hung Dao", 10.7546, 106.6634),
    Area("Ho Chi Minh City", "District 7", "Nguyen Van Linh", 10.7292, 106.7216),
    Area("Ho Chi Minh City", "Binh Thanh", "Dien Bien Phu", 10.8039, 106.7093),
    Area("Ho Chi Minh City", "Phu Nhuan", "Phan Dinh Phung", 10.7994, 106.6795),
    Area("Ho Chi Minh City", "Tan Binh", "Cong Hoa", 10.8016, 106.6527),
    Area("Ho Chi Minh City", "Go Vap", "Quang Trung", 10.8386, 106.6653),
    Area("Ho Chi Minh City", "Thu Duc", "Vo Van Ngan", 10.8506, 106.7715),
    Area("Hanoi", "Hoan Kiem", "Tran Quang Khai", 21.0285, 105.8542),
    Area("Hanoi", "Ba Dinh", "Doi Can", 21.0333, 105.8200),
    Area("Hanoi", "Cau Giay", "Xuan Thuy", 21.0333, 105.7900),
    Area("Hanoi", "Tay Ho", "Lac Long Quan", 21.0700, 105.8200),
    Area("Hanoi", "Ha Dong", "Quang Trung", 20.9700, 105.7800),
    Area("Hanoi", "Long Bien", "Nguyen Van Cu", 21.0400, 105.8900),
    Area("Da Nang", "Hai Chau", "Nguyen Van Linh", 16.0544, 108.2022),
    Area("Da Nang", "Thanh Khe", "Dien Bien Phu", 16.0678, 108.1800),
    Area("Da Nang", "Ngu Hanh Son", "Le Van Hien", 16.0200, 108.2500),
    Area("Hai Phong", "Le Chan", "To Hieu", 20.8449, 106.6881),
    Area("Can Tho", "Ninh Kieu", "Tran Phu", 10.0452, 105.7469),
    Area("Nha Trang", "Loc Tho", "Tran Phu", 12.2388, 109.1967),
    Area("Hue", "Phu Nhuan", "Le Loi", 16.4637, 107.5909),
    Area("Bien Hoa", "Tan Mai", "Pham Van Thuan", 10.9574, 106.8426),
    Area("Vung Tau", "Thang Tam", "Thuy Van", 10.3460, 107.0843),
    Area("Da Lat", "Ward 1", "Tran Phu", 11.9404, 108.4583),
    Area("Quy Nhon", "Nguyen Van Cu", "An Duong Vuong", 13.7820, 109.2196),
]


@dataclass(frozen=True)
class SportPlan:
    code: str
    venue_noun: str
    court_label: str
    price_from: int
    price_to: int
    open_time: time
    close_time: time
    min_courts: int
    max_courts: int
    amenity: str


SPORT_PLANS = [
    SportPlan("tennis", "Tennis Club", "Court", 200_000, 320_000,
              time(6, 0), time(22, 0), 2, 4, "floodlights, racket rental, and shaded seating"),
    SportPlan("badminton", "Badminton Hall", "Court", 70_000, 120_000,
              time(6, 0), time(22, 0), 3, 6, "sprung wooden floors, lockers, and a drinks bar"),
    SportPlan("basketball", "Basketball Arena", "Court", 180_000, 260_000,
              time(7, 0), time(22, 0), 1, 2, "glass backboards, scoreboard, and changing rooms"),
    SportPlan("football", "Football Ground", "Pitch", 350_000, 600_000,
              time(6, 0), time(23, 0), 2, 4, "artificial turf, floodlights, and bib rental"),
    SportPlan("volleyball", "Volleyball Center", "Court", 150_000, 220_000,
              time(7, 0), time(21, 0), 1, 3, "regulation nets, sand pit, and outdoor showers"),
    SportPlan("pickleball", "Pickleball Yard", "Court", 120_000, 200_000,
              time(6, 0), time(21, 0), 2, 5, "new nets, LED lighting, and paddle rental"),
]


@dataclass
class CenterPlan:
    host_index: int
    title: str
    description: str
    address: str
    latitude: Decimal
    longitude: Decimal
    review_count: int
    review_average_rating: Decimal
    image_offset: int
    courts: list[dict]


def _jitter(rng: random.Random, value: float, spread: float) -> float:
    return value + rng.uniform(-spread, spread)


def _court_plans(rng: random.Random, plan: SportPlan, start_index: int) -> list[dict]:
    count = rng.randint(plan.min_courts, plan.max_courts)
    close_hour = plan.close_time.hour - rng.choice([0, 0, 1])
    price = rng.randrange(plan.price_from, plan.price_to, 10_000)
    return [
        {
            "sport": plan.code,
            "title": f"{plan.court_label} {start_index + offset}",
            "description": (
                f"{plan.court_label} {start_index + offset} — kept match-ready, "
                f"booked in 60-minute blocks."
            ),
            "price_per_hour": Decimal(price + offset * 10_000),
            "open_time": plan.open_time,
            "close_time": time(close_hour, 0),
        }
        for offset in range(count)
    ]


def _build_plans(count: int, host_count: int, rng: random.Random) -> list[CenterPlan]:
    plans: list[CenterPlan] = []
    for index in range(count):
        area = AREAS[index % len(AREAS)]
        plan = SPORT_PLANS[index % len(SPORT_PLANS)]
        courts = _court_plans(rng, plan, 1)
        if rng.random() < 0.35:
            extra = SPORT_PLANS[(index + rng.randint(1, 5)) % len(SPORT_PLANS)]
            courts += _court_plans(rng, extra, len(courts) + 1)

        street_number = rng.randint(2, 480)
        plans.append(CenterPlan(
            host_index=index % host_count,
            title=f"{area.district} {plan.venue_noun} #{index + 1:02d}",
            description=(
                f"{plan.venue_noun} in {area.district}, {area.city}. "
                f"Expect {plan.amenity}. Open daily with same-day booking."
            ),
            address=f"{street_number} {area.street}, {area.district}, {area.city}",
            latitude=Decimal(f"{_jitter(rng, area.lat, 0.035):.6f}"),
            longitude=Decimal(f"{_jitter(rng, area.lng, 0.035):.6f}"),
            review_count=rng.randint(3, 86),
            review_average_rating=Decimal(f"{rng.uniform(3.7, 5.0):.2f}"),
            image_offset=index * 3,
            courts=courts,
        ))
    return plans


def _ensure_hosts(count: int, password: str) -> list[User]:
    hosts: list[User] = []
    for index in range(count):
        name = HOST_NAMES[index % len(HOST_NAMES)]
        email = f"host{index + 1:02d}@{HOST_EMAIL_DOMAIN}"
        user, _ = User.objects.get_or_create(
            username=email,
            defaults={"email": email, "is_active": True},
        )
        user.email = email
        user.is_active = True
        user.set_password(password)
        user.save(update_fields=["email", "is_active", "password"])

        profile = UserProfile.for_user(user)
        profile.name = name
        profile.phone_number = f"+84 9{index + 10:02d} {index + 100:03d} {index + 200:03d}"
        profile.address = AREAS[index % len(AREAS)].district
        if profile.avatar_id is None:
            profile.avatar = Image.objects.create(
                owner=user,
                url=IMAGE_URLS[index % len(IMAGE_URLS)],
                public_id="",
                kind=None,
            )
        profile.save()
        hosts.append(user)
    return hosts


def _image_url(offset: int) -> str:
    return IMAGE_URLS[offset % len(IMAGE_URLS)]


def _image_rows(
    owner: User,
    content_type: ContentType,
    object_id: int,
    *,
    logo_offset: int,
    gallery_count: int,
) -> list[Image]:
    rows = [Image(
        owner=owner,
        content_type=content_type,
        object_id=object_id,
        url=_image_url(logo_offset),
        kind=Image.Kind.LOGO,
        sort_order=0,
    )]
    rows += [
        Image(
            owner=owner,
            content_type=content_type,
            object_id=object_id,
            url=_image_url(logo_offset + 1 + position),
            kind=Image.Kind.GALLERY,
            sort_order=position,
        )
        for position in range(gallery_count)
    ]
    return rows


def _slot_rows(court: Court, schedules: list[CourtSchedule], days: int) -> list[CourtSlot]:
    today = date.today()
    rows: list[CourtSlot] = []
    for offset in range(days + 1):
        slot_date = today + timedelta(days=offset)
        for start_time, end_time in generate_slots_from_schedules(schedules, slot_date):
            rows.append(CourtSlot(
                court=court,
                date=slot_date,
                start_time=start_time,
                end_time=end_time,
                is_available=True,
            ))
    return rows


def _delete_seeded(hosts: list[User]) -> tuple[int, int]:
    """Centers cascade to courts/schedules/slots; generic images need explicit cleanup."""
    center_type = ContentType.objects.get_for_model(CourtCenter)
    court_type = ContentType.objects.get_for_model(Court)
    center_ids = list(
        CourtCenter.objects.filter(owner__in=hosts).values_list("id", flat=True)
    )
    court_ids = list(
        Court.objects.filter(center_id__in=center_ids).values_list("id", flat=True)
    )
    images, _ = Image.objects.filter(
        content_type=center_type, object_id__in=center_ids
    ).delete()
    court_images, _ = Image.objects.filter(
        content_type=court_type, object_id__in=court_ids
    ).delete()
    CourtCenter.objects.filter(id__in=center_ids).delete()
    return len(center_ids), images + court_images


class Command(BaseCommand):
    help = "Seed many published court centers (with courts, schedules, slots, images) for the search page"

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=60, help="Centers to seed (default: 60)")
        parser.add_argument("--hosts", type=int, default=8, help="Host accounts to spread them over (default: 8)")
        parser.add_argument("--slot-days", type=int, default=14, dest="slot_days",
                            help="Days of bookable slots per court (default: 14)")
        parser.add_argument("--password", default=DEFAULT_PASSWORD, help="Password for seeded hosts")
        parser.add_argument("--seed", type=int, default=20260922, help="RNG seed for reproducible data")
        parser.add_argument("--reset", action="store_true",
                            help="Delete previously seeded centers (and their images) first")

    @transaction.atomic
    def handle(self, *args, **options):
        count: int = options["count"]
        host_count: int = max(1, min(options["hosts"], len(HOST_NAMES)))
        slot_days: int = options["slot_days"]
        if count < 1:
            raise CommandError("--count must be at least 1")

        sports = {sport.code: sport for sport in Sport.objects.all()}
        missing = {plan.code for plan in SPORT_PLANS} - set(sports)
        if missing:
            raise CommandError(
                f"Missing sports: {', '.join(sorted(missing))}. Run migrations first."
            )

        rng = random.Random(options["seed"])
        hosts = _ensure_hosts(host_count, options["password"])

        if options["reset"]:
            removed_centers, removed_images = _delete_seeded(hosts)
            self.stdout.write(f"Reset: removed {removed_centers} center(s), {removed_images} image(s).")

        center_type = ContentType.objects.get_for_model(CourtCenter)
        court_type = ContentType.objects.get_for_model(Court)
        existing_titles = set(
            CourtCenter.objects.filter(owner__in=hosts).values_list("title", flat=True)
        )

        created_centers = 0
        created_courts = 0
        created_slots = 0
        skipped = 0

        for plan in _build_plans(count, host_count, rng):
            if plan.title in existing_titles:
                skipped += 1
                continue

            host = hosts[plan.host_index]
            center = CourtCenter.objects.create(
                owner=host,
                title=plan.title,
                description=plan.description,
                address=plan.address,
                latitude=plan.latitude,
                longitude=plan.longitude,
                status=CourtCenter.Status.PUBLISHED,
                review_count=plan.review_count,
                review_average_rating=plan.review_average_rating,
            )
            created_centers += 1

            Image.objects.bulk_create(_image_rows(
                host,
                center_type,
                center.id,
                logo_offset=plan.image_offset,
                gallery_count=3,
            ))

            courts = Court.objects.bulk_create([
                Court(
                    center=center,
                    sport=sports[court["sport"]],
                    title=court["title"],
                    description=court["description"],
                    price_per_hour=court["price_per_hour"],
                    price_currency="VND",
                )
                for court in plan.courts
            ])
            created_courts += len(courts)

            court_images: list[Image] = []
            schedules: list[CourtSchedule] = []
            for position, (court, court_plan) in enumerate(zip(courts, plan.courts)):
                court_images += _image_rows(
                    host,
                    court_type,
                    court.id,
                    logo_offset=plan.image_offset + 2 + position,
                    gallery_count=2,
                )
                schedules += [
                    CourtSchedule(
                        court=court,
                        day_of_week=day,
                        start_time=court_plan["open_time"],
                        end_time=court_plan["close_time"],
                    )
                    for day in range(7)
                ]
            Image.objects.bulk_create(court_images)
            CourtSchedule.objects.bulk_create(schedules)

            slots: list[CourtSlot] = []
            for court in courts:
                court_schedules = [s for s in schedules if s.court_id == court.id]
                slots += _slot_rows(court, court_schedules, slot_days)
            CourtSlot.objects.bulk_create(slots, batch_size=2000, ignore_conflicts=True)
            created_slots += len(slots)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {created_centers} published center(s), {created_courts} court(s), "
            f"{created_slots} slot(s) over {host_count} host(s); skipped {skipped} existing."
        ))
        self.stdout.write(
            f"Hosts: host01..host{host_count:02d}@{HOST_EMAIL_DOMAIN} / {options['password']}"
        )
        self.stdout.write(
            "Reviews use the denormalized review_count / review_average_rating fields "
            "(Review rows need real transactions)."
        )
