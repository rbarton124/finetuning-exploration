from __future__ import annotations
import argparse, asyncio, json, logging, os, random, textwrap
from datetime import date, timedelta
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from openai import AsyncOpenAI
try:                                # SDK>=1.6
    from openai import RateLimitError
except ImportError:                 # older SDK
    from openai.error import RateLimitError

from pydantic import BaseModel, Field, ValidationError, ConfigDict
from tqdm.asyncio import tqdm

# ---------- logging & env ---------- #
load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("itingen")

# ---------- option pools ---------- #

DESTINATIONS = [
    # Europe
    "Paris, France", "Rome, Italy", "Barcelona, Spain", "Lisbon, Portugal",
    "Reykjavik, Iceland", "Athens, Greece", "Prague, Czech Republic",
    "Edinburgh, Scotland", "Zurich, Switzerland", "Istanbul, Türkiye",
    # Americas
    "New York City, USA", "San Francisco, USA", "Vancouver, Canada",
    "Buenos Aires, Argentina", "Rio de Janeiro, Brazil", "Mexico City, Mexico",
    # Asia–Pacific
    "Tokyo, Japan", "Bangkok, Thailand", "Bali, Indonesia", "Seoul, South Korea",
    "Sydney, Australia", "Auckland, New Zealand", "Hanoi, Vietnam", "Dubai, UAE",
    # Africa / Middle East
    "Cape Town, South Africa", "Marrakesh, Morocco", "Cairo, Egypt",
    "Johannesburg, South Africa", "Jerusalem, Israel"
]

INTERESTS = [
    "adventure", "beaches", "food", "hiking", "historical", "museums",
    "nature", "nightlife", "shopping", "sports", "wildlife", "cultural",
    "photography", "architecture", "wellness", "art", "music", "wine",
    "skiing", "technology"
]

VACATION_TYPES = [
    "adventure", "family", "romantic", "relaxation", "cultural", "foodie",
    "luxury", "budget", "solo", "friends", "wellness", "business",
    "eco-tourism", "road-trip", "city-break", "cruise", "backpacking",
    "ski-holiday", "beach-resort", "festival", "boys-trip", "girls-trip",
    "solo trip", "honeymoon", "spring break", "immersion",
]

EXTRA_INSTRUCTIONS = [
    # ── ultra-short stubs ──────────────────────────────────────
    "Two sights a day. Lunch + dinner set.",
    "City-break: walk everywhere, no car.",
    "Hostels + street food. Cheap.",
    "Kids in tow; early nights.",
    "All outdoors; pack a picnic.",
    "Museum marathon—just line ’em up.",
    "No stairs, please.",
    "Film-buff itinerary.",
    "Coffee-lover focus.",

    # ── short, descriptive lines ───────────────────────────────
    "Rail preferred; skip domestic flights.",
    "Eco-conscious: bike-share and trams; avoid taxis.",
    "Gluten- and lactose-free dining picks only.",
    "Sunrise photo shoots on the quietest mornings.",
    "Night-owls: bars till 02:00, slow mornings.",
    "Pet-friendly hotel; list a nearby park.",
    "Glamping accommodation—stylish safari tent.",
    "Rental-car loop; scenic drives only.",
    "Include a ferry ride for the views.",
    "Fit in any local festival that overlaps.",
    "One tasting-menu dinner; keep the rest casual.",

    # ── medium-length directions ───────────────────────────────
    "Cap the itinerary at three organized stops a day; schedule lunch but leave dinner open for street-food discoveries.",
    "Early starts at 8 am, wrap by dusk; include breakfast cafés, lunch diners, and a laid-back dinner bistro.",
    "We’re photography minded—time major overlooks for golden hour and slot a sunrise viewpoint on the quietest day.",
    "Morning excursion plus calmer afternoon walk; suggest lunch and dinner, leaning on public transit over long rideshares.",
    "Guided hike one day and an evening cooking class; keep the following afternoon entirely free for market wandering.",
    "Family of four with kids 8 & 10—daily walking limit about 5 km and at least one playground stop.",
    "Remote-work couple: two one-hour quiet blocks daily; nearby Wi-Fi cafés or a hotel lounge help.",
    "Wellness focus: morning yoga option, vegetarian lunch spots, a spa block one afternoon, and an overall slow pace.",
    "Rainy-season visit: offer an indoor back-up for every outdoor plan so we can swap easily.",
    "Live-music fans—slot a jazz bar or small concert but nothing that ends past midnight.",
    "Anniversary dinner with a view on the third evening; otherwise keep activities low-key and walkable.",
    "Prefer boutique hotels with local design flair—no big chains.",

    # ── longer, chatty paragraphs ──────────────────────────────
    "We’re after a true slow-travel vibe: no internal flights, scenic rail or a single ferry is perfect. One eco-certified hotel for the whole stay, light luggage, lots of platform time to watch the world roll by.",
    "Shoestring adventure for backpackers—one rucksack each and hostels are fine if they’re clean. Daily budget around 100 bucks, lunch at markets, night markets after dark, and at least one completely free morning to sleep late.",
    "Luxury-lite but sustainable: choose an eco-label hotel, avoid single-use plastics, move between cities by electric train or hybrid ferry, and highlight seasonal local cuisine with one splash-out tasting menu.",
    "Birthday trip for my 70-year-old dad—two thoughtfully paced activities daily, plenty of café breaks, reliable elevators at the hotel, and leisurely scenic drives using the rental car we already booked.",
    "Autumn-foliage road loop for five friends; no highways if possible, a couple of moderate hikes, one rustic lodge with a sauna, and food ranging from farm-shop picnics to hearty taverns."
]

# ---------- strict schema ---------- #
class TravelDetails(BaseModel):
    arrival_date: str; arrival_time: str
    departure_date: str; departure_time: str

class HotelInfo(BaseModel):
    name: str; check_in_date: str; check_out_date: str

class Travel(BaseModel):
    mode_of_transportation: str
    travel_details: TravelDetails
    hotel: HotelInfo

class Activity(BaseModel):
    date: str; start_time: str; end_time: str
    activity: str; website: str; description: str

class Itinerary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    destination: str; start_date: str; end_date: str
    travel: Travel
    activitiesANDdining: List[Activity] = Field(min_length=1)

# ---------- helpers ---------- #
client = AsyncOpenAI()
file_lock = asyncio.Lock()          # single writer lock

def weighted_trip_length() -> int:
    short = [3, 4, 5, 6] * 8        # 80 %
    long  = [7, 8, 9, 10] * 2       # 20 %
    return random.choice(short + long)

def random_dates() -> tuple[str, str]:
    start = date.today() + timedelta(days=random.randint(30, 365))
    end   = start + timedelta(days=weighted_trip_length()-1)
    return start.isoformat(), end.isoformat()

def build_user_msg() -> str:
    dest  = random.choice(DESTINATIONS)
    s, e  = random_dates()
    ints  = ", ".join(random.sample(INTERESTS, random.randint(1, 4)))
    vac   = random.choice(VACATION_TYPES)
    extra = random.choice(EXTRA_INSTRUCTIONS)
    return textwrap.dedent(f"""
        Destination: {dest}

        Trip Dates: {s} to {e}

        Interests: {ints}

        Vacation Type: {vac}

        Additional Details and Instructions: {extra}
    """).strip()

async def openai_call(system_prompt: str, user_msg: str,
                      model: str, temp: float, retries: int) -> str:
    for attempt in range(retries + 1):
        try:
            res = await client.chat.completions.create(
                model=model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_msg}
                ],
                temperature=temp,
            )
            return res.choices[0].message.content
        except RateLimitError:
            wait = (2 ** attempt) + random.random()
            log.warning("rate-limit: sleeping %.1fs", wait)
            await asyncio.sleep(wait)
        except Exception as e:
            log.warning("OpenAI err %s", e)
    raise RuntimeError("max retries exceeded")

def validate(jstr: str) -> Itinerary:
    return Itinerary.model_validate_json(jstr)

# ---------- worker ---------- #
async def generate_one(sys_prompt: str, args, out_path: Path) -> bool:
    user_msg = build_user_msg()
    try:
        jtxt = await openai_call(sys_prompt, user_msg,
                                 args.model, args.temp, args.max_retries)
        validate(jtxt)                      # raises if invalid
        record = {"messages": [
            {"role": "system",    "content": sys_prompt},
            {"role": "user",      "content": user_msg},
            {"role": "assistant", "content": jtxt}
        ]}
        async with file_lock:
            with out_path.open("a", buffering=1, encoding="utf-8") as f:
                json.dump(record, f, ensure_ascii=False)
                f.write("\n")
                f.flush(); os.fsync(f.fileno())
        return True
    except (ValidationError, json.JSONDecodeError) as e:
        log.info("reject: %s", e)
    return False

# ---------- orchestrator ---------- #
async def main(args):
    sys_prompt = Path("system_prompt.txt").read_text(encoding="utf-8")
    out = Path(args.out)
    if not args.append and out.exists():
        out.unlink()
    out.parent.mkdir(parents=True, exist_ok=True)

    total, ok = args.n, 0
    sem = asyncio.Semaphore(args.concurrency)

    async def task():
        async with sem:
            return await generate_one(sys_prompt, args, out)

    with tqdm(total=total, desc="Itineraries") as bar:
        coros: list[asyncio.Task] = []
        while ok < total:
            # Spawn additional workers if needed
            need = total - ok - len(coros)
            for _ in range(max(0, need)):
                coros.append(asyncio.create_task(task()))

            done, pending = await asyncio.wait(
                coros, return_when=asyncio.FIRST_COMPLETED)

            coros = list(pending)           # keep same type for .append
            success = sum(t.result() for t in done)  # True == 1, False == 0
            ok += success
            bar.update(success)

            # clean up exceptions to avoid "Task exception was never retrieved"
            for t in done:
                if not t.result():
                    _ = t.exception() if t.exception() else None

    log.info("Accepted %s of %s requested", ok, total)

# ---------- CLI ---------- #
if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--n",   type=int, required=True, help="how many itineraries")
    ap.add_argument("--out", required=True,           help="output JSONL file")
    ap.add_argument("--append", action="store_true",  help="append to existing")
    ap.add_argument("--model", default="gpt-4.1")
    ap.add_argument("--concurrency", type=int, default=100)
    ap.add_argument("--max-retries", type=int, default=2)
    ap.add_argument("--temp", type=float, default=0.9)
    args = ap.parse_args()

    try:
        asyncio.run(main(args))
    except KeyboardInterrupt:
        log.warning("Interrupted by user")
