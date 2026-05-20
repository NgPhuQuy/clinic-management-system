import random
from datetime import date, timedelta, time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker

from clinic_app.models import (
    User, Specialty, Service, Patient, Doctor, DoctorSchedule,
    Appointment, AppointmentService, MedicalRecord, TestResult,
    MedicineCategory, Medicine, Inventory,
    Prescription, PrescriptionDetail,
    Payment, Consultation, ChatMessage, Notification,
)
from oauth2_provider.models import Application

fake = Faker("vi_VN")


# ---------------------------------------------------------------------------
# Du lieu mau co dinh
# ---------------------------------------------------------------------------

SPECIALTIES = [
    ("Noi tong quat",   "Kham va dieu tri cac benh noi khoa thong thuong"),
    ("Tim mach",        "Chan doan va dieu tri benh tim mach"),
    ("Nhi khoa",        "Cham soc suc khoe tre em tu so sinh den 16 tuoi"),
    ("Da lieu",         "Dieu tri cac benh ve da, toc, mong"),
    ("Than kinh",       "Chan doan benh lien quan he than kinh"),
    ("San phu khoa",    "Cham soc suc khoe phu nu va thai san"),
    ("Tai mui hong",    "Dieu tri cac benh tai, mui, hong"),
    ("Mat",             "Kham va dieu tri cac benh ve mat"),
]

MEDICINE_CATEGORIES = [
    "Khang sinh",
    "Giam dau - Ha sot",
    "Tim mach - Huyet ap",
    "Tieu hoa",
    "Ho hap",
    "Vitamin & Khoang chat",
    "Than kinh",
    "Da lieu",
]

# (ten, ma, hoat chat, don vi, gia, can ke don, danh muc index)
MEDICINES = [
    ("Amoxicillin 500mg",    "AMX500",  "Amoxicillin",       "vien",  3500,   True,  0),
    ("Azithromycin 250mg",   "AZI250",  "Azithromycin",      "vien",  8000,   True,  0),
    ("Paracetamol 500mg",    "PAR500",  "Paracetamol",       "vien",  500,    False, 1),
    ("Ibuprofen 400mg",      "IBU400",  "Ibuprofen",         "vien",  2000,   False, 1),
    ("Amlodipine 5mg",       "AML5",    "Amlodipine",        "vien",  2500,   True,  2),
    ("Metformin 500mg",      "MET500",  "Metformin",         "vien",  1800,   True,  2),
    ("Omeprazole 20mg",      "OMP20",   "Omeprazole",        "vien",  3000,   True,  3),
    ("Domperidone 10mg",     "DOM10",   "Domperidone",       "vien",  2200,   False, 3),
    ("Salbutamol 4mg",       "SAL4",    "Salbutamol",        "vien",  1500,   True,  4),
    ("Cetirizine 10mg",      "CET10",   "Cetirizine",        "vien",  1200,   False, 4),
    ("Vitamin C 500mg",      "VITC500", "Ascorbic acid",     "vien",  800,    False, 5),
    ("Vitamin D3 1000IU",    "VITD3",   "Cholecalciferol",   "vien",  2000,   False, 5),
    ("Diazepam 5mg",         "DIA5",    "Diazepam",          "vien",  1500,   True,  6),
    ("Clotrimazole cream",   "CLO1",    "Clotrimazole",      "tuyp",  35000,  False, 7),
]

BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

DIAGNOSES = [
    "Viem hong cap",
    "Cam cum thong thuong",
    "Tang huyet ap do I",
    "Dai thao duong type 2",
    "Dau da day",
    "Viem da tiep xuc",
    "Dau dau cang co",
    "Viem phe quan cap",
    "Roi loan lo au",
    "Thieu mau nhe",
]

SYMPTOMS = [
    "Sot 38-39 do C, dau hong, kho nuot",
    "Ho, so mui, met moi",
    "Dau dau, chong mat, huyet ap >140/90",
    "Tieu nhieu lan, khat nuoc, met moi",
    "Dau thuong vi, buon non sau an",
    "Ngua, man do vung da tiep xuc",
    "Dau dau 2 ben thai duong, cang co co vai",
    "Ho co dom, kho tho nhe",
    "Lo lang qua muc, mat ngu, tim dap nhanh",
    "Met moi, da xanh xao, hoa mat",
]

TEST_NAMES = [
    ("Cong thuc mau",  "So luong te bao mau trong gioi han binh thuong", "",        "Binh thuong"),
    ("Duong huyet",    "5.8",                                             "mmol/L",  "3.9 - 6.1"),
    ("Huyet ap",       "130/85",                                          "mmHg",    "< 120/80"),
    ("Cholesterol",    "4.9",                                             "mmol/L",  "< 5.2"),
    ("AST/ALT",        "28/32",                                           "U/L",     "< 40"),
    ("Creatinine",     "88",                                              "umol/L",  "60 - 110"),
    ("Urinalysis",     "Khong phat hien bat thuong",                      "",        "Binh thuong"),
]


# ---------------------------------------------------------------------------
# Command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Seed du lieu mau vao database (Faker vi_VN)"

    def add_arguments(self, parser):
        parser.add_argument("--clear",    action="store_true", help="Xoa data cu truoc khi seed")
        parser.add_argument("--patients", type=int, default=10, help="So benh nhan (default: 10)")
        parser.add_argument("--doctors",  type=int, default=8,  help="So bac si (default: 8)")

    def handle(self, *args, **kwargs):
        if kwargs["clear"]:
            self._clear_data()

        n_patients = kwargs["patients"]
        n_doctors  = kwargs["doctors"]

        self.stdout.write("\nBat dau seed du lieu...\n")

        specialties  = self._seed_specialties()
        services     = self._seed_services(specialties)
        med_cats     = self._seed_medicine_categories()
        medicines    = self._seed_medicines(med_cats)
        _            = self._seed_inventory(medicines)
        doctors      = self._seed_doctors(n_doctors, specialties)
        _            = self._seed_schedules(doctors)
        patients     = self._seed_patients(n_patients)
        appointments = self._seed_appointments(patients, doctors, services)
        records      = self._seed_medical_records(appointments, doctors, patients)
        _            = self._seed_prescriptions(records, doctors, patients, medicines)
        _            = self._seed_payments(appointments, patients)
        _            = self._seed_notifications(patients, doctors)
        _            = self._seed_oauth2_application()

        self.stdout.write(self.style.SUCCESS("\nSeed hoan tat!\n"))
        self._print_summary(n_patients, n_doctors)

    # -----------------------------------------------------------------------
    # Clear
    # -----------------------------------------------------------------------

    def _clear_data(self):
        self.stdout.write("Xoa data cu...")
        models_to_clear = [
            Notification, ChatMessage, Consultation, Payment,
            PrescriptionDetail, Prescription, TestResult, MedicalRecord,
            AppointmentService, Appointment, DoctorSchedule,
            Inventory, Medicine, MedicineCategory,
            Patient, Doctor,
            Service, Specialty,
        ]
        for model in models_to_clear:
            model.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        Application.objects.all().delete()
        self.stdout.write("   -> Xong\n")

    # -----------------------------------------------------------------------
    # OAuth2 Application — tao tu dong de khong phai vao Admin thu cong
    # -----------------------------------------------------------------------

    def _seed_oauth2_application(self):
        self.stdout.write("OAuth2 Application...")
        admin_user = User.objects.filter(is_superuser=True).first()
        app, created = Application.objects.get_or_create(
            name="Clinic App",
            defaults={
                "client_type": Application.CLIENT_CONFIDENTIAL,
                "authorization_grant_type": Application.GRANT_PASSWORD,
                "user": admin_user,
            },
        )
        if created:
            self.stdout.write(f"   -> Da tao moi")
            self.stdout.write(f"   -> client_id     : {app.client_id}")
            self.stdout.write(f"   -> client_secret : {app.client_secret}")
        else:
            self.stdout.write("   -> Da ton tai, bo qua")
        self.stdout.write("")
        return app

    # -----------------------------------------------------------------------
    # Specialties & Services
    # -----------------------------------------------------------------------

    def _seed_specialties(self):
        self.stdout.write("Chuyen khoa...")
        objs = []
        for name, desc in SPECIALTIES:
            obj, _ = Specialty.objects.get_or_create(name=name, defaults={"description": desc})
            objs.append(obj)
        self.stdout.write(f"   -> {len(objs)} chuyen khoa\n")
        return objs

    def _seed_services(self, specialties):
        self.stdout.write("Dich vu...")
        service_templates = [
            "Kham tong quat", "Tu van suc khoe", "Sieu am",
            "Xet nghiem mau", "Do dien tim", "Chup X-quang",
        ]
        objs = []
        for specialty in specialties:
            for svc_name in random.sample(service_templates, k=3):
                price = random.choice([150000, 200000, 250000, 300000, 350000, 500000])
                obj, _ = Service.objects.get_or_create(
                    specialty=specialty,
                    name=f"{svc_name} - {specialty.name}",
                    defaults={"price": price, "description": fake.sentence()},
                )
                objs.append(obj)
        self.stdout.write(f"   -> {len(objs)} dich vu\n")
        return objs

    # -----------------------------------------------------------------------
    # Medicines & Inventory
    # -----------------------------------------------------------------------

    def _seed_medicine_categories(self):
        self.stdout.write("Danh muc thuoc...")
        objs = []
        for name in MEDICINE_CATEGORIES:
            obj, _ = MedicineCategory.objects.get_or_create(name=name)
            objs.append(obj)
        self.stdout.write(f"   -> {len(objs)} danh muc\n")
        return objs

    def _seed_medicines(self, categories):
        self.stdout.write("Thuoc...")
        objs = []
        for name, code, generic, unit, price, rx, cat_idx in MEDICINES:
            obj, _ = Medicine.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "generic_name": generic,
                    "unit": unit,
                    "price": price,
                    "requires_prescription": rx,
                    "category": categories[cat_idx],
                    "description": fake.sentence(),
                },
            )
            objs.append(obj)
        self.stdout.write(f"   -> {len(objs)} thuoc\n")
        return objs

    def _seed_inventory(self, medicines):
        self.stdout.write("Kho thuoc...")
        suppliers = ["Cong ty Duoc Ha Noi", "DHG Pharma", "Imexpharm", "Stada Vietnam"]
        objs = []
        for med in medicines:
            for batch_num in range(1, 3):
                batch = f"LO{med.code}{batch_num:02d}"
                # Dung Decimal de tranh loi khi nhan voi gia la DecimalField
                import_price = int(Decimal(str(med.price)) * Decimal("0.7"))
                obj, _ = Inventory.objects.get_or_create(
                    medicine=med,
                    batch_number=batch,
                    defaults={
                        "quantity": random.randint(20, 200),
                        "expiry_date": date.today() + timedelta(days=random.randint(180, 720)),
                        "import_price": import_price,
                        "supplier": random.choice(suppliers),
                        "warning_threshold": 10,
                    },
                )
                objs.append(obj)
        self.stdout.write(f"   -> {len(objs)} lo hang\n")
        return objs

    # -----------------------------------------------------------------------
    # Users: Doctors & Patients
    # -----------------------------------------------------------------------

    def _make_user(self, role, index):
        """Tao User voi email duy nhat theo role+index, password mac dinh Test@1234."""
        first = fake.first_name()
        last  = fake.last_name()
        email = f"{role}{index}@clinic.test"
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": f"{role}{index}",
                "role": role,
                "is_active": True,
            },
        )
        if created:
            user.set_password("Test@1234")
            user.save()
        return user, f"{last} {first}"

    def _seed_doctors(self, n, specialties):
        self.stdout.write(f"Bac si ({n} nguoi)...")
        degrees = ["BS.", "ThS.BS.", "TS.BS.", "PGS.TS.BS."]
        objs = []
        for i in range(1, n + 1):
            user, full_name = self._make_user("doctor", i)
            degree = random.choice(degrees)
            doctor, _ = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": f"{degree} {full_name}",
                    "specialty": random.choice(specialties),
                    "license_number": f"BS{i:05d}",
                    "experience_years": random.randint(2, 25),
                    "consultation_fee": random.choice([200000, 300000, 350000, 500000]),
                    "bio": fake.paragraph(nb_sentences=3),
                    "is_available": True,
                },
            )
            objs.append(doctor)
        self.stdout.write(f"   -> {len(objs)} bac si\n")
        return objs

    def _seed_schedules(self, doctors):
        """Seed lich lam viec cho 3 tuan (tru Chu nhat)."""
        self.stdout.write("Lich lam viec...")
        shifts = [
            (time(7, 30), time(11, 30)),
            (time(13, 0), time(17, 0)),
        ]
        today = date.today()
        objs = []
        for doctor in doctors:
            for day_offset in range(-7, 14):
                work_date = today + timedelta(days=day_offset)
                if work_date.weekday() == 6:   # bo Chu nhat
                    continue
                for start, end in random.sample(shifts, k=random.randint(1, 2)):
                    obj, _ = DoctorSchedule.objects.get_or_create(
                        doctor=doctor,
                        date=work_date,
                        start_time=start,
                        defaults={
                            "end_time": end,
                            "max_appointments": random.randint(8, 15),
                            "is_available": True,
                        },
                    )
                    objs.append(obj)
        self.stdout.write(f"   -> {len(objs)} ca lam viec\n")
        return objs

    def _seed_patients(self, n):
        self.stdout.write(f"Benh nhan ({n} nguoi)...")
        objs = []
        for i in range(1, n + 1):
            user, full_name = self._make_user("patient", i)
            dob = fake.date_of_birth(minimum_age=5, maximum_age=80)
            patient, _ = Patient.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": full_name,
                    "date_of_birth": dob,
                    "gender": random.choice(["male", "female"]),
                    "phone": fake.phone_number(),
                    "address": fake.address(),
                    "insurance_number": f"BH{fake.numerify('##########')}",
                    "blood_type": random.choice(BLOOD_TYPES),
                    "emergency_contact": f"{fake.name()} - {fake.phone_number()}",
                },
            )
            objs.append(patient)
        self.stdout.write(f"   -> {len(objs)} benh nhan\n")
        return objs

    # -----------------------------------------------------------------------
    # Appointments
    # -----------------------------------------------------------------------

    def _seed_appointments(self, patients, doctors, services):
        self.stdout.write("Lich hen...")
        statuses = ["pending", "confirmed", "completed", "cancelled", "no_show"]
        weights  = [10, 15, 50, 15, 10]
        today = date.today()
        objs = []

        for patient in patients:
            for _ in range(random.randint(2, 5)):
                doctor = random.choice(doctors)
                days_offset = random.randint(-30, 14)
                appt_dt = timezone.make_aware(
                    fake.date_time_between(
                        start_date=today + timedelta(days=days_offset),
                        end_date=today + timedelta(days=days_offset),
                    )
                )
                # Status hop ly theo thoi gian: tuong lai chi co pending/confirmed
                if appt_dt > timezone.now():
                    status = random.choices(["pending", "confirmed"], weights=[40, 60])[0]
                else:
                    status = random.choices(statuses, weights=weights)[0]

                schedule = DoctorSchedule.objects.filter(
                    doctor=doctor, date=appt_dt.date()
                ).first()

                appt = Appointment.objects.create(
                    patient=patient,
                    doctor=doctor,
                    schedule=schedule,
                    appointment_date=appt_dt,
                    status=status,
                    reason=fake.sentence(nb_words=8),
                    notes=fake.sentence() if random.random() > 0.6 else "",
                )

                # Them 1-2 dich vu tuong ung chuyen khoa bac si
                doctor_services = [s for s in services if s.specialty == doctor.specialty]
                if not doctor_services:
                    doctor_services = services[:3]
                for svc in random.sample(doctor_services, k=min(2, len(doctor_services))):
                    AppointmentService.objects.create(
                        appointment=appt,
                        service=svc,
                        quantity=1,
                        price_at_time=svc.price,
                    )
                objs.append(appt)

        self.stdout.write(f"   -> {len(objs)} lich hen\n")
        return objs

    # -----------------------------------------------------------------------
    # Medical Records
    # -----------------------------------------------------------------------

    def _seed_medical_records(self, appointments, doctors, patients):
        self.stdout.write("Ho so benh an...")
        completed = [a for a in appointments if a.status == "completed"]
        objs = []
        for appt in completed:
            idx = random.randint(0, len(DIAGNOSES) - 1)
            record = MedicalRecord.objects.create(
                patient=appt.patient,
                doctor=appt.doctor,
                appointment=appt,
                diagnosis=DIAGNOSES[idx],
                symptoms=SYMPTOMS[idx],
                treatment_notes=fake.paragraph(nb_sentences=2),
                follow_up_date=(
                    appt.appointment_date.date() + timedelta(days=random.randint(7, 30))
                    if random.random() > 0.5 else None
                ),
            )
            # 50% co ket qua xet nghiem
            if random.random() > 0.5:
                test_name, result, unit, ref = random.choice(TEST_NAMES)
                TestResult.objects.create(
                    medical_record=record,
                    test_name=test_name,
                    result=result,
                    unit=unit,
                    reference_range=ref,
                    test_date=appt.appointment_date.date(),
                )
            objs.append(record)
        self.stdout.write(f"   -> {len(objs)} ho so benh an\n")
        return objs

    # -----------------------------------------------------------------------
    # Prescriptions
    # -----------------------------------------------------------------------

    def _seed_prescriptions(self, records, doctors, patients, medicines):
        self.stdout.write("Don thuoc...")
        dosages     = ["1 vien", "2 vien", "1/2 vien"]
        frequencies = ["1 lan/ngay", "2 lan/ngay", "3 lan/ngay"]
        statuses    = ["pending", "dispensed", "dispensed", "dispensed"]
        objs = []
        for record in records:
            if random.random() < 0.3:   # 30% khong co don thuoc
                continue
            rx = Prescription.objects.create(
                medical_record=record,
                doctor=record.doctor,
                patient=record.patient,
                status=random.choice(statuses),
                notes=fake.sentence() if random.random() > 0.5 else "",
            )
            for med in random.sample(medicines, k=random.randint(1, 4)):
                qty = random.randint(10, 30)
                PrescriptionDetail.objects.create(
                    prescription=rx,
                    medicine=med,
                    quantity=qty,
                    dosage=random.choice(dosages),
                    frequency=random.choice(frequencies),
                    duration_days=random.randint(3, 14),
                    instructions=f"Uong {'sau' if random.random() > 0.5 else 'truoc'} an",
                    price_at_time=med.price,
                )
            objs.append(rx)
        self.stdout.write(f"   -> {len(objs)} don thuoc\n")
        return objs

    # -----------------------------------------------------------------------
    # Payments
    # -----------------------------------------------------------------------

    def _seed_payments(self, appointments, patients):
        self.stdout.write("Thanh toan...")
        methods = ["momo", "vnpay", "cash", "banking", "credit_card"]
        objs = []
        completed = [a for a in appointments if a.status == "completed"]
        for appt in completed:
            total = sum(
                s.price_at_time * s.quantity
                for s in appt.appointment_services.all()
            )
            total += appt.doctor.consultation_fee
            payment = Payment.objects.create(
                appointment=appt,
                patient=appt.patient,
                amount=total,
                payment_method=random.choice(methods),
                status="success",
                transaction_id=fake.uuid4(),
                paid_at=appt.appointment_date + timedelta(hours=1),
            )
            objs.append(payment)
        self.stdout.write(f"   -> {len(objs)} giao dich\n")
        return objs

    # -----------------------------------------------------------------------
    # Notifications
    # -----------------------------------------------------------------------

    def _seed_notifications(self, patients, doctors):
        self.stdout.write("Thong bao...")
        notif_types = [
            ("appointment_reminder",  "Nhac lich hen",           "Ban co lich hen kham vao ngay mai luc 9:00"),
            ("appointment_confirmed", "Lich hen duoc xac nhan",  "Lich hen cua ban da duoc xac nhan"),
            ("payment_success",       "Thanh toan thanh cong",   "Thanh toan cua ban da duoc xu ly thanh cong"),
            ("prescription_ready",    "Don thuoc san sang",      "Don thuoc cua ban da duoc chuan bi"),
            ("system",                "Thong bao he thong",      "He thong se bao tri vao cuoi tuan nay"),
        ]
        objs = []
        all_users = [p.user for p in patients] + [d.user for d in doctors]
        for user in all_users:
            for notif_type, title, msg in random.sample(notif_types, k=random.randint(2, 4)):
                n = Notification.objects.create(
                    user=user,
                    title=title,
                    message=msg,
                    type=notif_type,
                    is_read=random.random() > 0.4,
                )
                objs.append(n)
        self.stdout.write(f"   -> {len(objs)} thong bao\n")
        return objs

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------

    def _print_summary(self, n_patients, n_doctors):
        self.stdout.write("=" * 45)
        self.stdout.write("Tom tat du lieu da seed:")
        self.stdout.write(f"   Chuyen khoa     : {Specialty.objects.count()}")
        self.stdout.write(f"   Dich vu         : {Service.objects.count()}")
        self.stdout.write(f"   Danh muc thuoc  : {MedicineCategory.objects.count()}")
        self.stdout.write(f"   Thuoc           : {Medicine.objects.count()}")
        self.stdout.write(f"   Kho (lo hang)   : {Inventory.objects.count()}")
        self.stdout.write(f"   Bac si          : {Doctor.objects.count()}")
        self.stdout.write(f"   Ca lam viec     : {DoctorSchedule.objects.count()}")
        self.stdout.write(f"   Benh nhan       : {Patient.objects.count()}")
        self.stdout.write(f"   Lich hen        : {Appointment.objects.count()}")
        self.stdout.write(f"   Ho so benh an   : {MedicalRecord.objects.count()}")
        self.stdout.write(f"   Don thuoc       : {Prescription.objects.count()}")
        self.stdout.write(f"   Thanh toan      : {Payment.objects.count()}")
        self.stdout.write(f"   Thong bao       : {Notification.objects.count()}")
        self.stdout.write(f"   OAuth2 App      : {Application.objects.count()}")
        self.stdout.write("=" * 45)
        self.stdout.write("\nTai khoan test:")
        self.stdout.write("   Admin   : (tu tao bang createsuperuser)")
        self.stdout.write("   Bac si  : doctor1@clinic.test  / Test@1234")
        self.stdout.write("   BN      : patient1@clinic.test / Test@1234")
        self.stdout.write("=" * 45)