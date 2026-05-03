import random
from datetime import date, timedelta, time

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

fake = Faker("vi_VN")


# ─── Dữ liệu mẫu cố định ────────────────────────────────────────────────────

SPECIALTIES = [
    ("Nội tổng quát",   "Khám và điều trị các bệnh nội khoa thông thường"),
    ("Tim mạch",        "Chẩn đoán và điều trị bệnh tim mạch"),
    ("Nhi khoa",        "Chăm sóc sức khỏe trẻ em từ sơ sinh đến 16 tuổi"),
    ("Da liễu",         "Điều trị các bệnh về da, tóc, móng"),
    ("Thần kinh",       "Chẩn đoán bệnh liên quan hệ thần kinh"),
    ("Sản phụ khoa",    "Chăm sóc sức khoẻ phụ nữ và thai sản"),
    ("Tai mũi họng",    "Điều trị các bệnh tai, mũi, họng"),
    ("Mắt",             "Khám và điều trị các bệnh về mắt"),
]

MEDICINE_CATEGORIES = [
    "Kháng sinh",
    "Giảm đau - Hạ sốt",
    "Tim mạch - Huyết áp",
    "Tiêu hóa",
    "Hô hấp",
    "Vitamin & Khoáng chất",
    "Thần kinh",
    "Da liễu",
]

MEDICINES = [
    # (tên, mã, hoạt chất, đơn vị, giá, cần kê đơn, danh mục index)
    ("Amoxicillin 500mg",    "AMX500",  "Amoxicillin",       "viên",  3_500,  True,  0),
    ("Azithromycin 250mg",   "AZI250",  "Azithromycin",      "viên",  8_000,  True,  0),
    ("Paracetamol 500mg",    "PAR500",  "Paracetamol",       "viên",  500,    False, 1),
    ("Ibuprofen 400mg",      "IBU400",  "Ibuprofen",         "viên",  2_000,  False, 1),
    ("Amlodipine 5mg",       "AML5",    "Amlodipine",        "viên",  2_500,  True,  2),
    ("Metformin 500mg",      "MET500",  "Metformin",         "viên",  1_800,  True,  2),
    ("Omeprazole 20mg",      "OMP20",   "Omeprazole",        "viên",  3_000,  True,  3),
    ("Domperidone 10mg",     "DOM10",   "Domperidone",       "viên",  2_200,  False, 3),
    ("Salbutamol 4mg",       "SAL4",    "Salbutamol",        "viên",  1_500,  True,  4),
    ("Cetirizine 10mg",      "CET10",   "Cetirizine",        "viên",  1_200,  False, 4),
    ("Vitamin C 500mg",      "VITC500", "Ascorbic acid",     "viên",  800,    False, 5),
    ("Vitamin D3 1000IU",    "VITD3",   "Cholecalciferol",   "viên",  2_000,  False, 5),
    ("Diazepam 5mg",         "DIA5",    "Diazepam",          "viên",  1_500,  True,  6),
    ("Clotrimazole cream",   "CLO1",    "Clotrimazole",      "tuýp",  35_000, False, 7),
]

BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

DIAGNOSES = [
    "Viêm họng cấp",
    "Cảm cúm thông thường",
    "Tăng huyết áp độ I",
    "Đái tháo đường type 2",
    "Đau dạ dày",
    "Viêm da tiếp xúc",
    "Đau đầu căng cơ",
    "Viêm phế quản cấp",
    "Rối loạn lo âu",
    "Thiếu máu nhẹ",
]

SYMPTOMS = [
    "Sốt 38-39°C, đau họng, khó nuốt",
    "Ho, sổ mũi, mệt mỏi",
    "Đau đầu, chóng mặt, huyết áp >140/90",
    "Tiểu nhiều lần, khát nước, mệt mỏi",
    "Đau thượng vị, buồn nôn sau ăn",
    "Ngứa, mẩn đỏ vùng da tiếp xúc",
    "Đau đầu 2 bên thái dương, căng cơ cổ vai",
    "Ho có đờm, khó thở nhẹ",
    "Lo lắng quá mức, mất ngủ, tim đập nhanh",
    "Mệt mỏi, da xanh xao, hoa mắt",
]

TEST_NAMES = [
    ("Công thức máu",   "Số lượng tế bào máu trong giới hạn bình thường",  "", "Bình thường"),
    ("Đường huyết",     "5.8",  "mmol/L",  "3.9 - 6.1"),
    ("Huyết áp",        "130/85", "mmHg",  "< 120/80"),
    ("Cholesterol",     "4.9",  "mmol/L",  "< 5.2"),
    ("AST/ALT",         "28/32", "U/L",    "< 40"),
    ("Creatinine",      "88",   "µmol/L",  "60 - 110"),
    ("Urinalysis",      "Không phát hiện bất thường", "", "Bình thường"),
]


class Command(BaseCommand):
    help = "Seed dữ liệu mẫu vào database (dùng Faker vi_VN)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Xóa toàn bộ data cũ trước khi seed",
        )
        parser.add_argument(
            "--patients",
            type=int,
            default=10,
            help="Số lượng bệnh nhân (default: 10)",
        )
        parser.add_argument(
            "--doctors",
            type=int,
            default=8,
            help="Số lượng bác sĩ (default: 8)",
        )

    def handle(self, *args, **kwargs):
        if kwargs["clear"]:
            self._clear_data()

        n_patients = kwargs["patients"]
        n_doctors  = kwargs["doctors"]

        self.stdout.write("\n🌱 Bắt đầu seed dữ liệu...\n")

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

        self.stdout.write(self.style.SUCCESS("\n✅ Seed hoàn tất!\n"))
        self._print_summary(n_patients, n_doctors)

    # ─── Clear ───────────────────────────────────────────────────────────────

    def _clear_data(self):
        self.stdout.write("🗑️  Xóa data cũ...")
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
        self.stdout.write("   → Xong\n")

    # ─── Specialties & Services ───────────────────────────────────────────────

    def _seed_specialties(self):
        self.stdout.write("📋 Seeding chuyên khoa...")
        objs = []
        for name, desc in SPECIALTIES:
            obj, _ = Specialty.objects.get_or_create(name=name, defaults={"description": desc})
            objs.append(obj)
        self.stdout.write(f"   → {len(objs)} chuyên khoa\n")
        return objs

    def _seed_services(self, specialties):
        self.stdout.write("🏥 Seeding dịch vụ...")
        service_templates = [
            "Khám tổng quát", "Tư vấn sức khỏe", "Siêu âm",
            "Xét nghiệm máu", "Đo điện tim", "Chụp X-quang",
        ]
        objs = []
        for specialty in specialties:
            for svc_name in random.sample(service_templates, k=3):
                price = random.choice([150_000, 200_000, 250_000, 300_000, 350_000, 500_000])
                obj, _ = Service.objects.get_or_create(
                    specialty=specialty,
                    name=f"{svc_name} - {specialty.name}",
                    defaults={"price": price, "description": fake.sentence()},
                )
                objs.append(obj)
        self.stdout.write(f"   → {len(objs)} dịch vụ\n")
        return objs

    # ─── Medicines ────────────────────────────────────────────────────────────

    def _seed_medicine_categories(self):
        self.stdout.write("💊 Seeding danh mục thuốc...")
        objs = []
        for name in MEDICINE_CATEGORIES:
            obj, _ = MedicineCategory.objects.get_or_create(name=name)
            objs.append(obj)
        self.stdout.write(f"   → {len(objs)} danh mục\n")
        return objs

    def _seed_medicines(self, categories):
        self.stdout.write("💊 Seeding thuốc...")
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
        self.stdout.write(f"   → {len(objs)} thuốc\n")
        return objs

    def _seed_inventory(self, medicines):
        self.stdout.write("📦 Seeding kho thuốc...")
        objs = []
        suppliers = ["Công ty Dược Hà Nội", "DHG Pharma", "Imexpharm", "Stada Vietnam"]
        for med in medicines:
            for batch_num in range(1, 3):
                batch = f"LO{med.code}{batch_num:02d}"
                obj, _ = Inventory.objects.get_or_create(
                    medicine=med,
                    batch_number=batch,
                    defaults={
                        "quantity": random.randint(20, 200),
                        "expiry_date": date.today() + timedelta(days=random.randint(180, 720)),
                        "import_price": int(med.price * 0.7),
                        "supplier": random.choice(suppliers),
                        "warning_threshold": 10,
                    },
                )
                objs.append(obj)
        self.stdout.write(f"   → {len(objs)} lô hàng\n")
        return objs

    # ─── Users: Doctors & Patients ───────────────────────────────────────────

    def _make_user(self, role, index):
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
        self.stdout.write(f"👨‍⚕️  Seeding {n} bác sĩ...")
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
                    "consultation_fee": random.choice([200_000, 300_000, 350_000, 500_000]),
                    "bio": fake.paragraph(nb_sentences=3),
                    "is_available": True,
                },
            )
            objs.append(doctor)
        self.stdout.write(f"   → {len(objs)} bác sĩ\n")
        return objs

    def _seed_schedules(self, doctors):
        self.stdout.write("📅 Seeding lịch làm việc...")
        objs = []
        shifts = [
            (time(7, 30), time(11, 30)),
            (time(13, 0), time(17, 0)),
        ]
        today = date.today()
        for doctor in doctors:
            for day_offset in range(-7, 14):           # 3 tuần
                work_date = today + timedelta(days=day_offset)
                if work_date.weekday() == 6:           # bỏ Chủ nhật
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
        self.stdout.write(f"   → {len(objs)} ca làm việc\n")
        return objs

    def _seed_patients(self, n):
        self.stdout.write(f"🧑‍🤝‍🧑 Seeding {n} bệnh nhân...")
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
        self.stdout.write(f"   → {len(objs)} bệnh nhân\n")
        return objs

    # ─── Appointments ─────────────────────────────────────────────────────────

    def _seed_appointments(self, patients, doctors, services):
        self.stdout.write("📆 Seeding lịch hẹn...")
        statuses = ["pending", "confirmed", "completed", "cancelled", "no_show"]
        weights  = [10, 15, 50, 15, 10]
        objs = []
        today = date.today()

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
                # Chọn status hợp lý theo thời gian
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
                # Thêm 1-2 dịch vụ
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

        self.stdout.write(f"   → {len(objs)} lịch hẹn\n")
        return objs

    # ─── Medical Records ──────────────────────────────────────────────────────

    def _seed_medical_records(self, appointments, doctors, patients):
        self.stdout.write("📋 Seeding hồ sơ bệnh án...")
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
            # Xét nghiệm (50% có)
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
        self.stdout.write(f"   → {len(objs)} hồ sơ bệnh án\n")
        return objs

    # ─── Prescriptions ────────────────────────────────────────────────────────

    def _seed_prescriptions(self, records, doctors, patients, medicines):
        self.stdout.write("💊 Seeding đơn thuốc...")
        dosages     = ["1 viên", "2 viên", "1/2 viên"]
        frequencies = ["1 lần/ngày", "2 lần/ngày", "3 lần/ngày"]
        statuses    = ["pending", "dispensed", "dispensed", "dispensed"]
        objs = []
        for record in records:
            if random.random() < 0.3:   # 30% không có đơn thuốc
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
                    instructions=f"Uống {'sau' if random.random() > 0.5 else 'trước'} ăn",
                    price_at_time=med.price,
                )
            objs.append(rx)
        self.stdout.write(f"   → {len(objs)} đơn thuốc\n")
        return objs

    # ─── Payments ─────────────────────────────────────────────────────────────

    def _seed_payments(self, appointments, patients):
        self.stdout.write("💳 Seeding thanh toán...")
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
        self.stdout.write(f"   → {len(objs)} giao dịch\n")
        return objs

    # ─── Notifications ────────────────────────────────────────────────────────

    def _seed_notifications(self, patients, doctors):
        self.stdout.write("🔔 Seeding thông báo...")
        notif_types = [
            ("appointment_reminder",  "Nhắc lịch hẹn",       "Bạn có lịch hẹn khám vào ngày mai lúc 9:00"),
            ("appointment_confirmed", "Lịch hẹn được xác nhận", "Lịch hẹn của bạn đã được xác nhận"),
            ("payment_success",       "Thanh toán thành công", "Thanh toán của bạn đã được xử lý thành công"),
            ("prescription_ready",    "Đơn thuốc sẵn sàng",   "Đơn thuốc của bạn đã được chuẩn bị"),
            ("system",                "Thông báo hệ thống",    "Hệ thống sẽ bảo trì vào cuối tuần này"),
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
        self.stdout.write(f"   → {len(objs)} thông báo\n")
        return objs

    # ─── Summary ─────────────────────────────────────────────────────────────

    def _print_summary(self, n_patients, n_doctors):
        self.stdout.write("=" * 45)
        self.stdout.write("Tóm tắt dữ liệu đã seed:")
        self.stdout.write(f"   Chuyên khoa     : {Specialty.objects.count()}")
        self.stdout.write(f"   Dịch vụ         : {Service.objects.count()}")
        self.stdout.write(f"   Danh mục thuốc  : {MedicineCategory.objects.count()}")
        self.stdout.write(f"   Thuốc           : {Medicine.objects.count()}")
        self.stdout.write(f"   Kho (lô hàng)   : {Inventory.objects.count()}")
        self.stdout.write(f"   Bác sĩ          : {Doctor.objects.count()}")
        self.stdout.write(f"   Ca làm việc     : {DoctorSchedule.objects.count()}")
        self.stdout.write(f"   Bệnh nhân       : {Patient.objects.count()}")
        self.stdout.write(f"   Lịch hẹn        : {Appointment.objects.count()}")
        self.stdout.write(f"   Hồ sơ bệnh án   : {MedicalRecord.objects.count()}")
        self.stdout.write(f"   Đơn thuốc       : {Prescription.objects.count()}")
        self.stdout.write(f"   Thanh toán      : {Payment.objects.count()}")
        self.stdout.write(f"   Thông báo       : {Notification.objects.count()}")
        self.stdout.write("=" * 45)
        self.stdout.write("\n🔑 Tài khoản test:")
        self.stdout.write("   Admin   : (tự tạo bằng createsuperuser)")
        self.stdout.write("   Bác sĩ  : doctor1@clinic.test  / Test@1234")
        self.stdout.write("   BN      : patient1@clinic.test / Test@1234")
        self.stdout.write("=" * 45)