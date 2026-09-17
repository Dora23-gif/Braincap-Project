import os
import sys

# Set up Django environment
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.insert(0, backend_dir)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.db import transaction
from apps.students.models import Student

def normalize_student_ids():
    print("Beginning student admission number normalization...")
    
    # Fetch all students ordered by ID
    students = list(Student.objects.order_by("id").all())
    total = len(students)
    print(f"Found {total} students in database.")

    with transaction.atomic():
        # Pass 1: Set temporary unique admission numbers to avoid UNIQUE constraint violations
        print("Pass 1: Assigning temporary admission numbers...")
        for i, student in enumerate(students, start=1):
            student.admission_number = f"TEMP/2026/{i:04d}"
            student.save(update_fields=["admission_number"])

        # Pass 2: Assign clean sequential admission numbers EIS/2026/0001 through EIS/2026/{total:04d}
        print("Pass 2: Assigning clean sequential admission numbers...")
        for i, student in enumerate(students, start=1):
            new_adm = f"EIS/2026/{i:04d}"
            student.admission_number = new_adm
            student.save(update_fields=["admission_number"])
            print(f"[{i:02d}/{total}] Student #{student.id}: {student.first_name} {student.last_name} -> {new_adm}")

    print("\nVerification of updated admission numbers:")
    for s in Student.objects.order_by("id").all():
        print(f"ID={s.id:02d} | AdmNo={s.admission_number} | Name={s.last_name}, {s.first_name} | Arm={s.current_class_arm.full_name if s.current_class_arm else 'None'}")

    print("\nNormalization complete successfully!")

if __name__ == "__main__":
    normalize_student_ids()
