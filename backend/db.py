"""Business data. Step 1: in-memory demo data. Step 2 replaces this with Supabase."""

DEMO_BUSINESSES = {
    "riverside-dental": {
        "id": "riverside-dental",
        "name": "Riverside Dental",
        "color": "#0f766e",
        "faq_text": """
Hours: Monday-Friday 8am-5pm, Saturday 9am-1pm, closed Sunday.
Location: 120 River Road, Suite 4.
Phone: (555) 010-2040.
New patients: Yes, we accept new patients. Book online or call.
Insurance: We accept Delta Dental, Cigna, Aetna, and MetLife.
Cleaning price without insurance: $120 for a standard cleaning.
Emergencies: Call the office. After hours, call the emergency line at (555) 010-2099.
Parking: Free parking behind the building.
""".strip(),
    }
}


def get_business(business_id: str):
    return DEMO_BUSINESSES.get(business_id)
