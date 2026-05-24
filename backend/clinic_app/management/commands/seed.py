"""
Seed dữ liệu mẫu cho Clinic Management System
Chạy: python manage.py seed [--clear] [--patients N] [--doctors N] [--staff N]

Accounts mặc định sau khi seed:
  Admin   : admin@clinic.test      / Admin@1234
  Bác sĩ  : doctor1@clinic.test    / Test@1234  (doctor1 → doctorN)
  NV y tế : staff1@clinic.test     / Test@1234  (staff1  → staffN)
  Bệnh nhân: patient1@clinic.test  / Test@1234  (patient1 → patientN)
"""

import random
from datetime import date, datetime, timedelta, time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from clinic_app.models import (
    User, Specialty, Service, Patient, Doctor, DoctorSchedule,
    Appointment, AppointmentService, MedicalRecord, TestResult,
    MedicineCategory, Medicine, Inventory, InventoryAlert,
    Prescription, PrescriptionDetail,
    Payment, Consultation, ChatMessage, Notification,
)

fake_first_names = [
    "Minh", "Hùng", "Tuấn", "Nam", "Đức", "Hải", "Long", "Phong", "Quân", "Dũng",
    "Lan", "Hương", "Ngọc", "Mai", "Linh", "Thu", "Hoa", "Thảo", "Nhung", "Trang",
    "Bảo", "Khoa", "Khải", "Hiếu", "Trung", "Kiên", "Tú", "Thành", "Việt", "Sơn",
]
fake_last_names = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
    "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Đoàn", "Trịnh", "Tô",
]

def rname():
    return f"{random.choice(fake_last_names)} {random.choice(fake_first_names)}"

def rphone():
    prefix = random.choice(["03", "07", "08", "09"])
    return prefix + "".join([str(random.randint(0, 9)) for _ in range(8)])

def rdate_past(min_days=1, max_days=365):
    return date.today() - timedelta(days=random.randint(min_days, max_days))

def rdt_past(min_hours=1, max_hours=720):
    return timezone.now() - timedelta(hours=random.randint(min_hours, max_hours))

# ─────────────────────────────────────────────────────────────────────────────
# Master data
# ─────────────────────────────────────────────────────────────────────────────

SPECIALTIES = [
    ("Nội tổng quát",  "Khám và điều trị các bệnh nội khoa thông thường"),
    ("Tim mạch",       "Chẩn đoán và điều trị bệnh tim mạch, huyết áp"),
    ("Nhi khoa",       "Chăm sóc sức khỏe trẻ em từ sơ sinh đến 16 tuổi"),
    ("Da liễu",        "Điều trị các bệnh về da, tóc, móng, thẩm mỹ da"),
    ("Thần kinh",      "Chẩn đoán và điều trị bệnh thần kinh, đột quỵ"),
    ("Sản phụ khoa",   "Chăm sóc sức khỏe phụ nữ, thai sản, phụ khoa"),
    ("Tai mũi họng",   "Điều trị các bệnh tai, mũi, họng, thanh quản"),
    ("Mắt",            "Khám và điều trị các bệnh về mắt, thị lực"),
    ("Xương khớp",     "Điều trị bệnh cơ xương khớp, chấn thương thể thao"),
    ("Tiêu hóa",       "Khám và điều trị bệnh đường tiêu hóa, gan mật"),
]

SERVICES_BY_SPECIALTY = {
    "Nội tổng quát":  ["Khám tổng quát", "Tư vấn sức khỏe", "Xét nghiệm máu cơ bản", "Đo điện tim", "Chụp X-quang ngực"],
    "Tim mạch":       ["Khám tim mạch", "Siêu âm tim", "Đo điện tim 12 chuyển đạo", "Holter ECG 24h", "Đo huyết áp 24h"],
    "Nhi khoa":       ["Khám nhi", "Tư vấn dinh dưỡng trẻ em", "Tiêm chủng", "Khám sơ sinh", "Kiểm tra phát triển"],
    "Da liễu":        ["Khám da liễu", "Điều trị mụn trứng cá", "Laser trị nám", "Sinh thiết da", "Điều trị vẩy nến"],
    "Thần kinh":      ["Khám thần kinh", "Điện não đồ", "MRI não", "Tư vấn đau đầu mãn tính", "Điều trị mất ngủ"],
    "Sản phụ khoa":   ["Khám thai định kỳ", "Siêu âm thai", "Xét nghiệm tiền sản", "Tư vấn kế hoạch hóa", "Khám phụ khoa"],
    "Tai mũi họng":   ["Khám tai mũi họng", "Nội soi tai mũi họng", "Điều trị viêm xoang", "Phẫu thuật amidan", "Thính lực đồ"],
    "Mắt":            ["Khám mắt", "Đo khúc xạ", "Điều trị đục thủy tinh thể", "Điều trị glaucoma", "Phẫu thuật mắt"],
    "Xương khớp":     ["Khám xương khớp", "Chụp X-quang xương", "Điều trị đau lưng", "Vật lý trị liệu", "Tiêm khớp"],
    "Tiêu hóa":       ["Khám tiêu hóa", "Nội soi dạ dày", "Nội soi đại tràng", "Siêu âm bụng", "Xét nghiệm Helicobacter"],
}

SERVICE_PRICES = [150_000, 200_000, 250_000, 300_000, 350_000, 400_000, 500_000, 600_000, 800_000, 1_000_000]

MEDICINE_CATEGORIES = [
    ("Kháng sinh",              "Thuốc kháng khuẩn, kháng nấm, kháng virus"),
    ("Giảm đau - Hạ sốt",      "Thuốc giảm đau, hạ sốt, chống viêm không steroid"),
    ("Tim mạch - Huyết áp",    "Thuốc điều trị tăng huyết áp, rối loạn lipid máu"),
    ("Tiêu hóa",               "Thuốc dạ dày, kháng acid, men tiêu hóa"),
    ("Hô hấp - Dị ứng",        "Thuốc ho, long đờm, kháng histamine, giãn phế quản"),
    ("Vitamin & Khoáng chất",  "Vitamin tổng hợp, sắt, canxi, kẽm, magie"),
    ("Thần kinh - Tâm thần",   "Thuốc an thần, chống trầm cảm, điều trị đau thần kinh"),
    ("Da liễu",                "Kem bôi, thuốc nấm da, corticosteroid tại chỗ"),
    ("Nội tiết - Đái tháo đường", "Insulin, metformin, thuốc tuyến giáp"),
    ("Nhãn khoa - Tai mũi họng", "Thuốc nhỏ mắt, thuốc nhỏ tai, xịt mũi"),
]

# (tên, mã, hoạt chất, đơn vị, giá bán, cần kê đơn, cat_idx, mô tả ngắn)
MEDICINES = [
    # Kháng sinh (cat 0)
    ("Amoxicillin 500mg",       "AMX500",    "Amoxicillin",            "viên",    3_500,  True,  0, "Kháng sinh nhóm penicillin phổ rộng"),
    ("Azithromycin 250mg",      "AZI250",    "Azithromycin",           "viên",    8_000,  True,  0, "Kháng sinh nhóm macrolide, điều trị nhiễm khuẩn hô hấp"),
    ("Ciprofloxacin 500mg",     "CIP500",    "Ciprofloxacin",          "viên",    5_500,  True,  0, "Kháng sinh nhóm fluoroquinolone phổ rộng"),
    ("Cefuroxime 250mg",        "CEF250",    "Cefuroxime axetil",      "viên",    12_000, True,  0, "Kháng sinh cephalosporin thế hệ 2"),
    ("Metronidazole 250mg",     "MET250",    "Metronidazole",          "viên",    2_000,  True,  0, "Kháng sinh điều trị nhiễm khuẩn kỵ khí và ký sinh trùng"),
    ("Doxycycline 100mg",       "DOX100",    "Doxycycline",            "viên",    4_000,  True,  0, "Kháng sinh nhóm tetracycline, điều trị mụn trứng cá, nhiễm khuẩn"),
    # Giảm đau - Hạ sốt (cat 1)
    ("Paracetamol 500mg",       "PAR500",    "Paracetamol",            "viên",    500,    False, 1, "Giảm đau, hạ sốt thông thường"),
    ("Paracetamol 650mg ER",    "PAR650",    "Paracetamol",            "viên",    2_000,  False, 1, "Paracetamol phóng thích kéo dài, giảm đau 8 tiếng"),
    ("Ibuprofen 400mg",         "IBU400",    "Ibuprofen",              "viên",    2_000,  False, 1, "Chống viêm không steroid, giảm đau, hạ sốt"),
    ("Diclofenac 50mg",         "DIC50",     "Diclofenac natri",       "viên",    3_000,  True,  1, "NSAID mạnh, điều trị đau xương khớp, đau sau phẫu thuật"),
    ("Meloxicam 7.5mg",         "MEL75",     "Meloxicam",              "viên",    5_000,  True,  1, "NSAID chọn lọc COX-2, ít tác dụng phụ dạ dày"),
    ("Tramadol 50mg",           "TRA50",     "Tramadol HCl",           "viên",    8_000,  True,  1, "Giảm đau opioid yếu, đau mức độ vừa đến nặng"),
    # Tim mạch - Huyết áp (cat 2)
    ("Amlodipine 5mg",          "AML5",      "Amlodipine besylate",    "viên",    2_500,  True,  2, "Chẹn kênh canxi, hạ huyết áp, điều trị đau thắt ngực"),
    ("Amlodipine 10mg",         "AML10",     "Amlodipine besylate",    "viên",    4_000,  True,  2, "Chẹn kênh canxi liều cao"),
    ("Losartan 50mg",           "LOS50",     "Losartan kali",          "viên",    5_000,  True,  2, "Ức chế thụ thể angiotensin II, hạ huyết áp"),
    ("Metoprolol 50mg",         "MTP50",     "Metoprolol succinate",   "viên",    4_500,  True,  2, "Chẹn beta chọn lọc, điều trị tăng huyết áp, nhịp tim nhanh"),
    ("Atorvastatin 20mg",       "ATO20",     "Atorvastatin canxi",     "viên",    7_000,  True,  2, "Statin, hạ cholesterol LDL, phòng ngừa bệnh tim mạch"),
    ("Aspirin 81mg",            "ASP81",     "Aspirin",                "viên",    1_000,  True,  2, "Chống kết tập tiểu cầu, phòng ngừa nhồi máu cơ tim"),
    # Tiêu hóa (cat 3)
    ("Omeprazole 20mg",         "OMP20",     "Omeprazole",             "viên",    3_000,  True,  3, "Ức chế bơm proton, điều trị loét dạ dày, trào ngược"),
    ("Pantoprazole 40mg",       "PAN40",     "Pantoprazole natri",     "viên",    5_000,  True,  3, "PPI thế hệ 2, ít tương tác thuốc hơn omeprazole"),
    ("Domperidone 10mg",        "DOM10",     "Domperidone maleate",    "viên",    2_200,  False, 3, "Chống nôn, tăng nhu động dạ dày"),
    ("Metoclopramide 10mg",     "MTC10",     "Metoclopramide HCl",     "viên",    1_500,  False, 3, "Chống nôn, trào ngược dạ dày thực quản"),
    ("Smecta 3g",               "SME3",      "Diosmectite",            "gói",     8_000,  False, 3, "Bảo vệ niêm mạc đường tiêu hóa, tiêu chảy"),
    ("Lactulose 15ml",          "LAC15",     "Lactulose",              "gói",     12_000, False, 3, "Điều trị táo bón, giảm amoniac trong bệnh gan"),
    # Hô hấp - Dị ứng (cat 4)
    ("Salbutamol 4mg",          "SAL4",      "Salbutamol sulfate",     "viên",    1_500,  True,  4, "Giãn phế quản, điều trị hen suyễn"),
    ("Cetirizine 10mg",         "CET10",     "Cetirizine HCl",         "viên",    1_200,  False, 4, "Kháng histamine thế hệ 2, điều trị dị ứng"),
    ("Loratadine 10mg",         "LOR10",     "Loratadine",             "viên",    1_000,  False, 4, "Kháng histamine không buồn ngủ, viêm mũi dị ứng"),
    ("Montelukast 10mg",        "MON10",     "Montelukast natri",      "viên",    15_000, True,  4, "Đối kháng leukotriene, kiểm soát hen và dị ứng"),
    ("Bromhexine 8mg",          "BRO8",      "Bromhexine HCl",         "viên",    1_500,  False, 4, "Long đờm, điều trị ho có đờm"),
    ("N-Acetylcysteine 200mg",  "NAC200",    "N-Acetylcysteine",       "gói",     5_000,  False, 4, "Tiêu đờm, chống oxy hóa"),
    # Vitamin & Khoáng chất (cat 5)
    ("Vitamin C 500mg",         "VITC500",   "Ascorbic acid",          "viên",    800,    False, 5, "Bổ sung vitamin C, tăng đề kháng"),
    ("Vitamin D3 1000IU",       "VITD3",     "Cholecalciferol",        "viên",    2_000,  False, 5, "Bổ sung vitamin D3, hỗ trợ hấp thu canxi"),
    ("Vitamin B complex",       "VITB",      "B1 + B6 + B12",          "viên",    1_500,  False, 5, "Bổ sung vitamin nhóm B, hỗ trợ thần kinh"),
    ("Canxi + D3 500mg",        "CALD3",     "Calci carbonat + D3",    "viên",    3_000,  False, 5, "Bổ sung canxi và vitamin D3, phòng loãng xương"),
    ("Sắt (II) Fumarate 60mg",  "FE60",      "Ferrous fumarate",       "viên",    2_500,  True,  5, "Điều trị thiếu máu thiếu sắt"),
    ("Magie B6",                "MAGB6",     "Magnesi lactate + B6",   "viên",    2_000,  False, 5, "Bổ sung magie, điều trị chuột rút, lo âu nhẹ"),
    ("Kẽm Gluconate 70mg",      "ZNC70",     "Zinc gluconate",         "viên",    2_500,  False, 5, "Bổ sung kẽm, tăng miễn dịch"),
    # Thần kinh - Tâm thần (cat 6)
    ("Diazepam 5mg",            "DIA5",      "Diazepam",               "viên",    1_500,  True,  6, "Benzodiazepine, điều trị lo âu, mất ngủ, co giật"),
    ("Amitriptyline 25mg",      "AMT25",     "Amitriptyline HCl",      "viên",    3_000,  True,  6, "Chống trầm cảm 3 vòng, điều trị đau thần kinh mãn tính"),
    ("Pregabalin 75mg",         "PRG75",     "Pregabalin",             "viên",    18_000, True,  6, "Điều trị đau thần kinh, động kinh, lo âu"),
    ("Piracetam 800mg",         "PIR800",    "Piracetam",              "viên",    4_000,  True,  6, "Cải thiện tuần hoàn não, điều trị chóng mặt"),
    # Da liễu (cat 7)
    ("Clotrimazole cream 1%",   "CLO1",      "Clotrimazole",           "tuýp",    35_000, False, 7, "Kháng nấm tại chỗ, điều trị nấm da, lang ben"),
    ("Hydrocortisone cream 1%", "HYD1",      "Hydrocortisone acetate", "tuýp",    28_000, False, 7, "Corticosteroid nhẹ, giảm ngứa, viêm da tiếp xúc"),
    ("Tretinoin 0.025%",        "TRE025",    "Tretinoin",              "tuýp",    85_000, True,  7, "Điều trị mụn trứng cá, chống lão hóa da"),
    ("Mupirocin 2%",            "MUP2",      "Mupirocin",              "tuýp",    45_000, True,  7, "Kháng sinh tại chỗ, điều trị chốc lở, nhiễm khuẩn da"),
    # Nội tiết - Đái tháo đường (cat 8)
    ("Metformin 500mg",         "MFM500",    "Metformin HCl",          "viên",    1_800,  True,  8, "Biguanide, điều trị đái tháo đường type 2"),
    ("Metformin 1000mg",        "MFM1000",   "Metformin HCl",          "viên",    3_500,  True,  8, "Biguanide liều cao"),
    ("Glibenclamide 5mg",       "GLI5",      "Glibenclamide",          "viên",    1_200,  True,  8, "Sulfonylurea, kích thích tụy tiết insulin"),
    ("Levothyroxine 50mcg",     "LEV50",     "Levothyroxine natri",    "viên",    3_000,  True,  8, "Hormone tuyến giáp, điều trị suy giáp"),
    # Nhãn khoa - Tai mũi họng (cat 9)
    ("Tobramycin nhỏ mắt 0.3%","TOB03",     "Tobramycin",             "lọ",      45_000, True,  9, "Kháng sinh nhỏ mắt, điều trị viêm kết mạc nhiễm khuẩn"),
    ("Naphazoline nhỏ mắt",     "NAP01",     "Naphazoline HCl",        "lọ",      25_000, False, 9, "Nhỏ mắt co mạch, giảm đỏ mắt"),
    ("Xylometazoline xịt mũi",  "XYL01",     "Xylometazoline HCl",     "lọ",      35_000, False, 9, "Xịt mũi co mạch, thông mũi nhanh"),
    ("Fluticasone xịt mũi",     "FLU50",     "Fluticasone propionate", "lọ",      85_000, True,  9, "Corticosteroid xịt mũi, điều trị viêm mũi dị ứng mãn tính"),
]

BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

DIAGNOSES = [
    ("Viêm họng cấp do liên cầu",           "Đau họng dữ dội, sốt cao 39-40°C, khó nuốt, amidan đỏ có mủ"),
    ("Cảm cúm (Influenza A)",               "Sốt đột ngột, đau cơ toàn thân, nhức đầu, ho khan, sổ mũi"),
    ("Tăng huyết áp độ II",                 "Đau đầu vùng chẩm, chóng mặt, huyết áp đo 160/100 mmHg"),
    ("Đái tháo đường type 2 mới phát hiện", "Tiểu nhiều lần, khát nước không thỏa, mệt mỏi, sụt cân không rõ nguyên nhân"),
    ("Loét dạ dày tá tràng",               "Đau thượng vị âm ỉ sau ăn, buồn nôn, ợ chua, đầy bụng"),
    ("Viêm da tiếp xúc dị ứng",            "Ngứa dữ dội, mẩn đỏ, phù nề vùng da tiếp xúc với dị nguyên"),
    ("Đau đầu migraine",                    "Đau nửa đầu từng cơn, nhạy cảm ánh sáng, tiếng động, nôn buồn nôn"),
    ("Viêm phế quản cấp",                  "Ho có đờm vàng xanh, sốt nhẹ, đau ngực khi ho, khó thở nhẹ"),
    ("Rối loạn lo âu lan tỏa",             "Lo âu quá mức, mất ngủ, tim đập nhanh, căng thẳng liên tục"),
    ("Thiếu máu thiếu sắt",               "Mệt mỏi, da xanh xao, hoa mắt, chóng mặt khi đứng dậy"),
    ("Viêm khớp gối thoái hóa",           "Đau gối khi vận động, cứng khớp buổi sáng, tiếng lạo xạo khi gấp duỗi"),
    ("Trào ngược dạ dày thực quản",        "Ợ nóng sau ăn, nóng rát ngực, khó nuốt, ho khan về đêm"),
    ("Viêm xoang cấp tính",               "Nghẹt mũi, chảy mũi mủ vàng xanh, đau nhức vùng mặt, mất ngửi"),
    ("Đau thắt lưng cơ học",              "Đau lưng dưới âm ỉ hoặc dữ dội, tăng khi vận động, giảm khi nghỉ ngơi"),
    ("Hội chứng ruột kích thích",          "Đau bụng, tiêu chảy hoặc táo bón xen kẽ, đầy hơi, khó chịu sau ăn"),
]

TEST_NAMES = [
    ("Công thức máu toàn phần (CBC)",   "WBC: 7.2 G/L, RBC: 4.8 T/L, Hgb: 14.2 g/dL, PLT: 250 G/L", "", "Bình thường"),
    ("Đường huyết lúc đói (FPG)",       "5.8", "mmol/L", "3.9 - 6.1"),
    ("HbA1c",                           "6.2", "%",       "< 6.5 (kiểm soát tốt)"),
    ("Huyết áp",                        "130/85", "mmHg", "< 120/80"),
    ("Cholesterol toàn phần",           "4.9", "mmol/L",  "< 5.2"),
    ("LDL-Cholesterol",                 "3.1", "mmol/L",  "< 3.4 (nguy cơ thấp)"),
    ("Triglyceride",                    "1.8", "mmol/L",  "< 2.3"),
    ("AST",                             "28",  "U/L",     "< 40"),
    ("ALT",                             "32",  "U/L",     "< 40"),
    ("Creatinine",                      "88",  "µmol/L",  "60 - 110"),
    ("Tổng phân tích nước tiểu",        "Không phát hiện bất thường", "", "Bình thường"),
    ("CRP (C-Reactive Protein)",        "12",  "mg/L",    "< 5"),
    ("TSH",                             "2.4", "µIU/mL",  "0.5 - 4.5"),
    ("Ferritin",                        "18",  "ng/mL",   "20 - 200 (thấp, thiếu sắt)"),
]

REASONS = [
    "Khám sức khỏe định kỳ", "Đau đầu kéo dài", "Ho dai dẳng hơn 2 tuần",
    "Sốt không rõ nguyên nhân", "Khó ngủ, mệt mỏi", "Đau bụng âm ỉ",
    "Tái khám theo hẹn", "Kiểm tra kết quả xét nghiệm", "Đau cơ khớp",
    "Dị ứng, nổi mề đay", "Huyết áp cao", "Tiểu đường kiểm tra định kỳ",
    "Đau ngực khi gắng sức", "Khó thở nhẹ", "Chóng mặt, hoa mắt",
    "Tư vấn dinh dưỡng", "Xin nghỉ bệnh", "Đau lưng dưới",
]

SUPPLIERS = [
    "Công ty Dược Hà Nội (Hanoi Pharma)",
    "DHG Pharma",
    "Imexpharm",
    "Stada Vietnam",
    "Pymepharco",
    "Domesco",
    "OPC Pharma",
    "Sanofi Vietnam",
    "Pfizer Vietnam",
    "Abbott Laboratories Vietnam",
]

STAFF_POSITIONS = [
    "Điều dưỡng viên",
    "Kỹ thuật viên xét nghiệm",
    "Dược sĩ",
    "Nhân viên lễ tân",
    "Kỹ thuật viên X-quang",
]

# ─────────────────────────────────────────────────────────────────────────────
# Command
# ─────────────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed dữ liệu mẫu vào database (dữ liệu tiếng Việt)"

    def add_arguments(self, parser):
        parser.add_argument("--clear",    action="store_true", help="Xóa data cũ trước khi seed")
        parser.add_argument("--patients", type=int, default=20, help="Số bệnh nhân (default: 20)")
        parser.add_argument("--doctors",  type=int, default=10, help="Số bác sĩ (default: 10)")
        parser.add_argument("--staff",    type=int, default=5,  help="Số nhân viên y tế (default: 5)")

    def handle(self, *args, **kwargs):
        if kwargs["clear"]:
            self._clear_data()

        n_patients = kwargs["patients"]
        n_doctors  = kwargs["doctors"]
        n_staff    = kwargs["staff"]

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write("  Bắt đầu seed dữ liệu Clinic Management System")
        self.stdout.write("=" * 50 + "\n")

        # self._seed_admin()
        specialties  = self._seed_specialties()
        services     = self._seed_services(specialties)
        med_cats     = self._seed_medicine_categories()
        medicines    = self._seed_medicines(med_cats)
        _            = self._seed_inventory(medicines)
        doctors      = self._seed_doctors(n_doctors, specialties)
        _            = self._seed_schedules(doctors)
        staff_users  = self._seed_staff(n_staff)
        patients     = self._seed_patients(n_patients)
        appointments = self._seed_appointments(patients, doctors, services)
        records      = self._seed_medical_records(appointments)
        _            = self._seed_prescriptions(records, medicines)
        _            = self._seed_payments(appointments)
        _            = self._seed_inventory_alerts(medicines)
        _            = self._seed_notifications(patients, doctors, staff_users, appointments)

        self.stdout.write(self.style.SUCCESS("\n✓ Seed hoàn tất!\n"))
        self._print_summary(n_patients, n_doctors, n_staff)

    # ─────────────────────────────────────────────────────────────────────────
    # Clear
    # ─────────────────────────────────────────────────────────────────────────

    def _clear_data(self):
        self.stdout.write("⚠  Xóa data cũ...")
        for model in [
            Notification, ChatMessage, Consultation, Payment,
            PrescriptionDetail, Prescription, TestResult, MedicalRecord,
            AppointmentService, Appointment, DoctorSchedule,
            InventoryAlert, Inventory, Medicine, MedicineCategory,
            Patient, Doctor,
            Service, Specialty,
        ]:
            model.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write("   → Xong\n")

    # ─────────────────────────────────────────────────────────────────────────
    # Admin
    # ─────────────────────────────────────────────────────────────────────────

    # def _seed_admin(self):
    #     self.stdout.write("👤 Admin...")
    #     admin, created = User.objects.get_or_create(
    #         email="admin@clinic.test",
    #         defaults={
    #             "username": "admin",
    #             "role": User.Role.ADMIN,
    #             "is_staff": True,
    #             "is_superuser": True,
    #             "is_active": True,
    #         },
    #     )
    #     if created:
    #         admin.set_password("Admin@1234")
    #         admin.save()
    #         self.stdout.write("   → Tạo admin@clinic.test / Admin@1234\n")
    #     else:
    #         self.stdout.write("   → admin đã tồn tại\n")

    # ─────────────────────────────────────────────────────────────────────────
    # Specialties & Services
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_specialties(self):
        self.stdout.write("🏥 Chuyên khoa...")
        objs = []
        for name, desc in SPECIALTIES:
            obj, _ = Specialty.objects.get_or_create(name=name, defaults={"description": desc})
            objs.append(obj)
        self.stdout.write(f"   → {len(objs)} chuyên khoa\n")
        return objs

    def _seed_services(self, specialties):
        self.stdout.write("🩺 Dịch vụ...")
        objs = []
        for specialty in specialties:
            svc_names = SERVICES_BY_SPECIALTY.get(specialty.name, ["Khám tổng quát"])
            for svc_name in svc_names:
                price = random.choice(SERVICE_PRICES)
                obj, _ = Service.objects.get_or_create(
                    specialty=specialty,
                    name=svc_name,
                    defaults={
                        "price": price,
                        "description": f"Dịch vụ {svc_name.lower()} tại khoa {specialty.name}",
                    },
                )
                objs.append(obj)
        self.stdout.write(f"   → {len(objs)} dịch vụ\n")
        return objs

    # ─────────────────────────────────────────────────────────────────────────
    # Medicines & Inventory
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_medicine_categories(self):
        self.stdout.write("💊 Danh mục thuốc...")
        objs = []
        for name, desc in MEDICINE_CATEGORIES:
            obj, _ = MedicineCategory.objects.get_or_create(name=name, defaults={"description": desc})
            objs.append(obj)
        self.stdout.write(f"   → {len(objs)} danh mục\n")
        return objs

    def _seed_medicines(self, categories):
        self.stdout.write("💊 Thuốc...")
        objs = []
        for name, code, generic, unit, price, rx, cat_idx, desc in MEDICINES:
            obj, _ = Medicine.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "generic_name": generic,
                    "unit": unit,
                    "price": price,
                    "requires_prescription": rx,
                    "category": categories[cat_idx],
                    "description": desc,
                    "is_active": True,
                },
            )
            objs.append(obj)
        self.stdout.write(f"   → {len(objs)} loại thuốc\n")
        return objs

    def _seed_inventory(self, medicines):
        self.stdout.write("📦 Kho thuốc...")
        objs = []
        today = date.today()
        for med in medicines:
            n_batches = random.randint(2, 4)
            for batch_num in range(1, n_batches + 1):
                batch_code = f"LO{med.code}-{today.year}{batch_num:02d}"
                import_price = int(Decimal(str(med.price)) * Decimal("0.65"))
                qty = random.randint(5, 500)
                # Một số lô sắp hết / sắp hết hạn để test cảnh báo
                if random.random() < 0.15:
                    qty = random.randint(1, 8)   # sắp hết
                expiry_offset = random.choices(
                    [random.randint(1, 20), random.randint(30, 90), random.randint(180, 900)],
                    weights=[10, 20, 70]
                )[0]
                obj, _ = Inventory.objects.get_or_create(
                    medicine=med,
                    batch_number=batch_code,
                    defaults={
                        "quantity": qty,
                        "expiry_date": today + timedelta(days=expiry_offset),
                        "import_date": today - timedelta(days=random.randint(1, 120)),
                        "import_price": import_price,
                        "supplier": random.choice(SUPPLIERS),
                        "warning_threshold": random.choice([10, 15, 20]),
                    },
                )
                objs.append(obj)
        self.stdout.write(f"   → {len(objs)} lô hàng\n")
        return objs

    def _seed_inventory_alerts(self, medicines):
        self.stdout.write("🚨 Cảnh báo kho...")
        today = date.today()
        objs = []
        for inv in Inventory.objects.select_related("medicine").all():
            if inv.quantity <= inv.warning_threshold:
                obj, _ = InventoryAlert.objects.get_or_create(
                    medicine=inv.medicine,
                    inventory=inv,
                    alert_type="low_stock",
                    defaults={
                        "message": f"Thuốc {inv.medicine.name} lô {inv.batch_number} chỉ còn {inv.quantity} {inv.medicine.unit}, dưới ngưỡng cảnh báo ({inv.warning_threshold}).",
                        "is_resolved": False,
                    },
                )
                objs.append(obj)
            if inv.expiry_date <= today + timedelta(days=30):
                alert_type = "expired" if inv.expiry_date <= today else "near_expiry"
                label = "Đã hết hạn" if alert_type == "expired" else "Sắp hết hạn"
                obj, _ = InventoryAlert.objects.get_or_create(
                    medicine=inv.medicine,
                    inventory=inv,
                    alert_type=alert_type,
                    defaults={
                        "message": f"{label}: {inv.medicine.name} lô {inv.batch_number}, HSD: {inv.expiry_date}",
                        "is_resolved": False,
                    },
                )
                objs.append(obj)
        self.stdout.write(f"   → {len(objs)} cảnh báo\n")
        return objs

    # ─────────────────────────────────────────────────────────────────────────
    # Users
    # ─────────────────────────────────────────────────────────────────────────

    def _make_user(self, role, index, full_name=None):
        email = f"{role}{index}@clinic.test"
        username = f"{role}{index}"
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": username,
                "role": role,
                "is_active": True,
            },
        )
        if created:
            user.set_password("Test@1234")
            user.save()
        return user, created

    def _seed_doctors(self, n, specialties):
        self.stdout.write(f"👨‍⚕️ Bác sĩ ({n} người)...")
        degrees = ["BS.", "ThS.BS.", "TS.BS.", "PGS.TS.BS.", "GS.TS.BS."]
        degree_weights = [40, 30, 15, 10, 5]
        fees = [200_000, 250_000, 300_000, 350_000, 500_000, 700_000]
        objs = []
        for i in range(1, n + 1):
            user, _ = self._make_user("doctor", i)
            degree = random.choices(degrees, weights=degree_weights)[0]
            name = rname()
            specialty = specialties[(i - 1) % len(specialties)]  # phân bổ đều các chuyên khoa
            doctor, _ = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": f"{degree} {name}",
                    "specialty": specialty,
                    "license_number": f"BS{i:05d}-HCM",
                    "experience_years": random.randint(3, 30),
                    "consultation_fee": random.choice(fees),
                    "bio": (
                        f"Bác sĩ {name} có {random.randint(3, 30)} năm kinh nghiệm trong lĩnh vực "
                        f"{specialty.name}. Tốt nghiệp Đại học Y Dược TP.HCM, đã tu nghiệp tại "
                        f"{random.choice(['Nhật Bản', 'Pháp', 'Mỹ', 'Singapore', 'Úc'])}. "
                        f"Chuyên điều trị {specialty.description.lower()}."
                    ),
                    "is_available": True,
                },
            )
            objs.append(doctor)
        self.stdout.write(f"   → {len(objs)} bác sĩ (doctor1-doctor{n}@clinic.test / Test@1234)\n")
        return objs

    def _seed_schedules(self, doctors):
        """Seed lịch làm việc 4 tuần: 3 tuần qua + tuần tới."""
        self.stdout.write("📅 Lịch làm việc...")
        shifts = [
            (time(7, 30),  time(11, 30)),
            (time(13, 0),  time(17, 0)),
            (time(17, 30), time(20, 30)),   # ca chiều tối
        ]
        today = date.today()
        objs = []
        for doctor in doctors:
            for day_offset in range(-21, 14):
                work_date = today + timedelta(days=day_offset)
                if work_date.weekday() == 6:    # bỏ Chủ nhật
                    continue
                # Ngẫu nhiên vắng 10% ngày
                if random.random() < 0.1:
                    continue
                chosen_shifts = random.sample(shifts, k=random.randint(1, 2))
                for start, end in chosen_shifts:
                    obj, _ = DoctorSchedule.objects.get_or_create(
                        doctor=doctor,
                        date=work_date,
                        start_time=start,
                        defaults={
                            "end_time": end,
                            "max_appointments": random.randint(8, 20),
                            "is_available": True,
                        },
                    )
                    objs.append(obj)
        self.stdout.write(f"   → {len(objs)} ca làm việc\n")
        return objs

    def _seed_staff(self, n):
        self.stdout.write(f"🧑‍💼 Nhân viên y tế ({n} người)...")
        objs = []
        for i in range(1, n + 1):
            user, created = self._make_user("staff", i)
            # Gắn thêm thông tin vào username field tạm thời (staff không có model riêng)
            if created:
                position = STAFF_POSITIONS[(i - 1) % len(STAFF_POSITIONS)]
                user.first_name = rname().split()[-1]
                user.last_name  = rname().split()[0]
                user.save()
            objs.append(user)
        self.stdout.write(f"   → {len(objs)} nhân viên (staff1-staff{n}@clinic.test / Test@1234)\n")
        return objs

    def _seed_patients(self, n):
        self.stdout.write(f"🧑‍🤝‍🧑 Bệnh nhân ({n} người)...")
        objs = []
        for i in range(1, n + 1):
            user, _ = self._make_user("patient", i)
            dob = date.today() - timedelta(days=random.randint(5 * 365, 75 * 365))
            name = rname()
            patient, _ = Patient.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": name,
                    "date_of_birth": dob,
                    "gender": random.choice(["male", "female"]),
                    "phone": rphone(),
                    "address": (
                        f"{random.randint(1, 200)} đường "
                        f"{random.choice(['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Đinh Tiên Hoàng', 'Phạm Ngũ Lão', 'Võ Văn Tần', 'Nam Kỳ Khởi Nghĩa'])}, "
                        f"P.{random.randint(1, 25)}, Q.{random.randint(1, 12)}, TP.HCM"
                    ),
                    "insurance_number": f"BH{''.join([str(random.randint(0,9)) for _ in range(10)])}",
                    "blood_type": random.choice(BLOOD_TYPES),
                    "emergency_contact": f"{rname()} - {rphone()}",
                },
            )
            objs.append(patient)
        self.stdout.write(f"   → {len(objs)} bệnh nhân (patient1-patient{n}@clinic.test / Test@1234)\n")
        return objs

    # ─────────────────────────────────────────────────────────────────────────
    # Appointments
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_appointments(self, patients, doctors, services):
        self.stdout.write("📋 Lịch hẹn...")
        objs = []
        now = timezone.now()
        today = date.today()

        # Phân bổ giờ làm việc thực tế
        work_hours = [
            (7, 30), (8, 0), (8, 30), (9, 0), (9, 30), (10, 0), (10, 30), (11, 0),
            (13, 0), (13, 30), (14, 0), (14, 30), (15, 0), (15, 30), (16, 0), (16, 30),
        ]

        for patient in patients:
            n_appts = random.randint(3, 8)
            for _ in range(n_appts):
                doctor = random.choice(doctors)
                day_offset = random.randint(-45, 14)
                appt_date = today + timedelta(days=day_offset)

                # Bỏ qua Chủ nhật
                if appt_date.weekday() == 6:
                    appt_date += timedelta(days=1)

                h, m = random.choice(work_hours)
                appt_dt = timezone.make_aware(
                    datetime(appt_date.year, appt_date.month, appt_date.day, h, m)
                )

                is_future = appt_dt > now
                if is_future:
                    status = random.choices(
                        ["pending", "confirmed"],
                        weights=[45, 55]
                    )[0]
                elif day_offset >= -1:  # hôm nay và hôm qua
                    status = random.choices(
                        ["in_progress", "completed", "confirmed", "pending"],
                        weights=[15, 55, 20, 10]
                    )[0]
                else:
                    status = random.choices(
                        ["completed", "cancelled", "no_show", "confirmed"],
                        weights=[65, 20, 10, 5]
                    )[0]

                schedule = DoctorSchedule.objects.filter(
                    doctor=doctor, date=appt_date
                ).first()

                appt = Appointment.objects.create(
                    patient=patient,
                    doctor=doctor,
                    schedule=schedule,
                    appointment_date=appt_dt,
                    status=status,
                    reason=random.choice(REASONS),
                    notes="" if random.random() > 0.4 else f"Bệnh nhân {random.choice(['cần xe lăn', 'cao tuổi cần hỗ trợ', 'dị ứng penicillin', 'đang dùng thuốc chống đông', 'mang thai', 'cho con bú'])}",
                )

                # 1-3 dịch vụ theo chuyên khoa bác sĩ
                doctor_services = [s for s in services if s.specialty == doctor.specialty]
                if not doctor_services:
                    doctor_services = services[:3]
                for svc in random.sample(doctor_services, k=min(random.randint(1, 3), len(doctor_services))):
                    AppointmentService.objects.create(
                        appointment=appt,
                        service=svc,
                        quantity=1,
                        price_at_time=svc.price,
                    )
                objs.append(appt)

        self.stdout.write(f"   → {len(objs)} lịch hẹn\n")
        return objs

    # ─────────────────────────────────────────────────────────────────────────
    # Medical Records
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_medical_records(self, appointments):
        self.stdout.write("📁 Hồ sơ bệnh án...")
        completed = [a for a in appointments if a.status in ("completed", "in_progress")]
        objs = []
        for appt in completed:
            diagnosis, symptoms = random.choice(DIAGNOSES)
            record = MedicalRecord.objects.create(
                patient=appt.patient,
                doctor=appt.doctor,
                appointment=appt,
                diagnosis=diagnosis,
                symptoms=symptoms,
                treatment_notes=(
                    f"Bệnh nhân đến khám với triệu chứng {symptoms.lower()}. "
                    f"Chẩn đoán: {diagnosis}. "
                    f"Điều trị: {random.choice(['Điều trị nội khoa bảo tồn', 'Dùng thuốc theo đơn', 'Theo dõi tại nhà', 'Nhập viện theo dõi'])}. "
                    f"Tiên lượng {random.choice(['tốt', 'khả quan', 'cần theo dõi thêm'])}."
                ),
                follow_up_date=(
                    appt.appointment_date.date() + timedelta(days=random.randint(7, 30))
                    if random.random() > 0.4 else None
                ),
            )

            # 60% hồ sơ có kết quả xét nghiệm
            if random.random() > 0.4:
                n_tests = random.randint(1, 3)
                for test_name, result, unit, ref in random.sample(TEST_NAMES, k=n_tests):
                    TestResult.objects.create(
                        medical_record=record,
                        test_name=test_name,
                        result=result,
                        unit=unit,
                        reference_range=ref,
                        test_date=appt.appointment_date.date(),
                        entered_by=appt.doctor.user,
                    )
            objs.append(record)

        self.stdout.write(f"   → {len(objs)} hồ sơ bệnh án\n")
        return objs

    # ─────────────────────────────────────────────────────────────────────────
    # Prescriptions
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_prescriptions(self, records, medicines):
        self.stdout.write("📝 Đơn thuốc...")
        dosages     = ["1 viên", "2 viên", "1/2 viên", "1 gói", "1 tuýp"]
        frequencies = ["1 lần/ngày", "2 lần/ngày", "3 lần/ngày", "Khi cần"]
        meal_instr  = ["Uống sau ăn 30 phút", "Uống trước ăn 30 phút", "Uống trong bữa ăn", "Uống khi cần, không quá 3 lần/ngày"]
        objs = []

        for record in records:
            if random.random() < 0.15:   # 15% không kê đơn
                continue

            status = random.choices(
                ["dispensed", "dispensed", "pending", "cancelled"],
                weights=[55, 20, 20, 5]
            )[0]

            dispensed_at = None
            if status == "dispensed":
                dispensed_at = record.appointment.appointment_date + timedelta(hours=random.randint(1, 4))

            rx = Prescription.objects.create(
                medical_record=record,
                doctor=record.doctor,
                patient=record.patient,
                status=status,
                dispensed_at=dispensed_at,
                notes=random.choice([
                    "", "",
                    "Tái khám nếu không cải thiện sau 5 ngày",
                    "Không uống rượu bia trong thời gian dùng thuốc",
                    "Báo ngay nếu có dị ứng",
                    "Phụ nữ mang thai cần hỏi ý kiến bác sĩ trước khi dùng",
                ]),
            )

            # Chọn thuốc phù hợp (ưu tiên không cần kê đơn + cần kê đơn theo tỷ lệ)
            rx_required = [m for m in medicines if m.requires_prescription]
            otc = [m for m in medicines if not m.requires_prescription]
            chosen = random.sample(otc, k=min(random.randint(1, 2), len(otc)))
            chosen += random.sample(rx_required, k=min(random.randint(1, 3), len(rx_required)))
            chosen = list(set(chosen))[:random.randint(2, 5)]

            for med in chosen:
                qty = random.randint(7, 30)
                PrescriptionDetail.objects.create(
                    prescription=rx,
                    medicine=med,
                    quantity=qty,
                    dosage=random.choice(dosages),
                    frequency=random.choice(frequencies),
                    duration_days=random.randint(3, 14),
                    instructions=random.choice(meal_instr),
                    price_at_time=med.price,
                )
            objs.append(rx)

        self.stdout.write(f"   → {len(objs)} đơn thuốc\n")
        return objs

    # ─────────────────────────────────────────────────────────────────────────
    # Payments
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_payments(self, appointments):
        self.stdout.write("💳 Thanh toán...")
        methods = ["momo", "vnpay", "cash", "banking", "credit_card"]
        method_weights = [20, 20, 35, 15, 10]
        objs = []

        for appt in appointments:
            if appt.status not in ("completed", "cancelled"):
                continue
            if Payment.objects.filter(appointment=appt).exists():
                continue

            services_total = sum(
                s.price_at_time * s.quantity
                for s in appt.appointment_services.all()
            )
            total = services_total + appt.doctor.consultation_fee

            if appt.status == "cancelled":
                pay_status = random.choices(["refunded", "failed", "pending"], weights=[30, 30, 40])[0]
                paid_at = None
            else:
                pay_status = random.choices(["success", "success", "pending"], weights=[80, 10, 10])[0]
                paid_at = appt.appointment_date + timedelta(minutes=random.randint(5, 90)) if pay_status == "success" else None

            method = random.choices(methods, weights=method_weights)[0]
            Payment.objects.create(
                appointment=appt,
                patient=appt.patient,
                amount=total,
                payment_method=method,
                status=pay_status,
                transaction_id=f"TXN{''.join([str(random.randint(0,9)) for _ in range(12)])}" if pay_status == "success" else "",
                paid_at=paid_at,
            )
            objs.append(appt)

        self.stdout.write(f"   → {len(objs)} giao dịch\n")
        return objs

    # ─────────────────────────────────────────────────────────────────────────
    # Notifications
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_notifications(self, patients, doctors, staff_users, appointments):
        self.stdout.write("🔔 Thông báo...")
        objs = []
        now = timezone.now()

        # ── Thông báo từ lịch hẹn thực tế ──────────────────────────────────
        for appt in appointments:
            patient_user = appt.patient.user
            doctor_user  = appt.doctor.user
            dt_str = appt.appointment_date.strftime("%H:%M %d/%m/%Y")

            # Xác nhận lịch cho bệnh nhân
            if appt.status == "confirmed":
                objs.append(Notification.objects.create(
                    user=patient_user,
                    title="✅ Lịch hẹn đã được xác nhận",
                    message=(
                        f"Lịch hẹn của bạn với BS. {appt.doctor.full_name} lúc {dt_str} "
                        f"đã được xác nhận. Vui lòng có mặt trước 15 phút."
                    ),
                    type=Notification.Type.APPOINTMENT_CONFIRMED,
                    is_read=random.random() > 0.3,
                    related_object_id=appt.id,
                ))

            # Nhắc lịch hẹn sắp tới (trong vòng 2 ngày)
            if appt.status in ("confirmed", "pending"):
                delta = appt.appointment_date - now
                if timedelta(0) < delta <= timedelta(days=2):
                    objs.append(Notification.objects.create(
                        user=patient_user,
                        title="⏰ Nhắc nhở lịch khám sắp tới",
                        message=(
                            f"Bạn có lịch khám với BS. {appt.doctor.full_name} "
                            f"({appt.doctor.specialty.name}) vào lúc {dt_str}. "
                            f"Lý do: {appt.reason}."
                        ),
                        type=Notification.Type.APPOINTMENT_REMINDER,
                        is_read=False,
                        related_object_id=appt.id,
                    ))

            # Hủy lịch
            if appt.status == "cancelled":
                objs.append(Notification.objects.create(
                    user=patient_user,
                    title="❌ Lịch hẹn đã bị hủy",
                    message=(
                        f"Lịch hẹn với BS. {appt.doctor.full_name} lúc {dt_str} đã bị hủy. "
                        f"Nếu bạn không yêu cầu hủy, vui lòng liên hệ phòng khám."
                    ),
                    type=Notification.Type.APPOINTMENT_CANCELLED,
                    is_read=random.random() > 0.5,
                    related_object_id=appt.id,
                ))

            # Thanh toán thành công
            try:
                payment = appt.payment
                if payment.status == "success":
                    objs.append(Notification.objects.create(
                        user=patient_user,
                        title="💰 Thanh toán thành công",
                        message=(
                            f"Thanh toán {int(payment.amount):,}đ cho lịch khám ngày "
                            f"{dt_str} đã được xử lý thành công. "
                            f"Mã giao dịch: {payment.transaction_id[:16] if payment.transaction_id else 'N/A'}."
                        ),
                        type=Notification.Type.PAYMENT_SUCCESS,
                        is_read=random.random() > 0.4,
                        related_object_id=payment.id,
                    ))
            except Exception:
                pass

            # Đơn thuốc sẵn sàng
            try:
                record = appt.medical_record
                if hasattr(record, "prescription") and record.prescription.status == "dispensed":
                    objs.append(Notification.objects.create(
                        user=patient_user,
                        title="💊 Đơn thuốc đã sẵn sàng",
                        message=(
                            f"Đơn thuốc từ buổi khám ngày {dt_str} đã được dược sĩ chuẩn bị. "
                            f"Vui lòng đến quầy dược để nhận thuốc."
                        ),
                        type=Notification.Type.PRESCRIPTION_READY,
                        is_read=random.random() > 0.5,
                        related_object_id=record.prescription.id,
                    ))
            except Exception:
                pass

            # Lịch hẹn mới cho bác sĩ
            if appt.status in ("pending", "confirmed"):
                objs.append(Notification.objects.create(
                    user=doctor_user,
                    title="📋 Lịch hẹn mới",
                    message=(
                        f"Bệnh nhân {appt.patient.full_name} đặt lịch khám lúc {dt_str}. "
                        f"Lý do: {appt.reason}."
                    ),
                    type=Notification.Type.APPOINTMENT_CONFIRMED,
                    is_read=random.random() > 0.3,
                    related_object_id=appt.id,
                ))

        # ── Cảnh báo kho thuốc cho nhân viên ────────────────────────────────
        low_stock_alerts = InventoryAlert.objects.filter(
            alert_type__in=["low_stock", "near_expiry", "expired"]
        ).select_related("medicine")[:20]

        for staff_user in staff_users:
            # Cảnh báo kho
            for alert in low_stock_alerts:
                type_label = {"low_stock": "⚠️ Cảnh báo tồn kho", "near_expiry": "⏳ Sắp hết hạn", "expired": "🚫 Đã hết hạn"}
                objs.append(Notification.objects.create(
                    user=staff_user,
                    title=type_label.get(alert.alert_type, "Cảnh báo kho"),
                    message=alert.message,
                    type=Notification.Type.INVENTORY_ALERT,
                    is_read=random.random() > 0.5,
                    related_object_id=alert.medicine.id,
                ))

            # Đơn thuốc chờ cấp phát
            pending_rxs = Prescription.objects.filter(status="pending").select_related("patient", "doctor")[:10]
            for rx in pending_rxs:
                objs.append(Notification.objects.create(
                    user=staff_user,
                    title="💊 Đơn thuốc chờ cấp phát",
                    message=(
                        f"Đơn thuốc #{rx.id} của BN {rx.patient.full_name} "
                        f"(kê bởi BS. {rx.doctor.full_name if rx.doctor else 'N/A'}) "
                        f"đang chờ được cấp phát."
                    ),
                    type=Notification.Type.PRESCRIPTION_READY,
                    is_read=False,
                    related_object_id=rx.id,
                ))

        # ── Thông báo hệ thống ───────────────────────────────────────────────
        system_msgs = [
            ("🔧 Bảo trì hệ thống", "Hệ thống sẽ bảo trì từ 23:00 - 01:00 ngày mai. Vui lòng hoàn tất công việc trước thời gian này."),
            ("📢 Cập nhật phần mềm", "Phiên bản mới đã được cập nhật với nhiều tính năng cải tiến. Vui lòng đăng xuất và đăng nhập lại."),
            ("🏥 Quy định mới", "Từ 01/06 áp dụng quy trình khám mới. Vui lòng đọc tài liệu đính kèm từ Ban giám đốc."),
            ("📊 Báo cáo tháng", "Báo cáo hoạt động tháng trước đã được tổng hợp. Vui lòng kiểm tra trên hệ thống."),
        ]
        all_users = (
            [p.user for p in patients]
            + [d.user for d in doctors]
            + staff_users
        )
        for user in all_users:
            for title, msg in random.sample(system_msgs, k=random.randint(1, 2)):
                objs.append(Notification.objects.create(
                    user=user,
                    title=title,
                    message=msg,
                    type=Notification.Type.SYSTEM,
                    is_read=random.random() > 0.6,
                ))

        self.stdout.write(f"   → {len(objs)} thông báo\n")
        return objs

    # ─────────────────────────────────────────────────────────────────────────
    # Summary
    # ─────────────────────────────────────────────────────────────────────────

    def _print_summary(self, n_patients, n_doctors, n_staff):
        w = 48
        sep = "─" * w

        def row(label, count):
            self.stdout.write(f"  {label:<28} {count:>6}")

        self.stdout.write("\n" + "=" * w)
        self.stdout.write("  📊 Tóm tắt dữ liệu đã seed")
        self.stdout.write(sep)
        row("Chuyên khoa",              Specialty.objects.count())
        row("Dịch vụ",                  Service.objects.count())
        row("Danh mục thuốc",           MedicineCategory.objects.count())
        row("Loại thuốc",               Medicine.objects.count())
        row("Lô hàng trong kho",        Inventory.objects.count())
        row("Cảnh báo kho",             InventoryAlert.objects.count())
        self.stdout.write(sep)
        row("Bác sĩ",                   Doctor.objects.count())
        row("Ca làm việc",              DoctorSchedule.objects.count())
        row("Nhân viên y tế",           User.objects.filter(role="staff").count())
        row("Bệnh nhân",                Patient.objects.count())
        self.stdout.write(sep)
        row("Lịch hẹn (tổng)",          Appointment.objects.count())
        row("  → Chờ xác nhận",         Appointment.objects.filter(status="pending").count())
        row("  → Đã xác nhận",          Appointment.objects.filter(status="confirmed").count())
        row("  → Đang khám",            Appointment.objects.filter(status="in_progress").count())
        row("  → Hoàn thành",           Appointment.objects.filter(status="completed").count())
        row("  → Đã hủy",              Appointment.objects.filter(status="cancelled").count())
        row("  → Không đến",            Appointment.objects.filter(status="no_show").count())
        self.stdout.write(sep)
        row("Hồ sơ bệnh án",            MedicalRecord.objects.count())
        row("Kết quả xét nghiệm",       TestResult.objects.count())
        row("Đơn thuốc (tổng)",         Prescription.objects.count())
        row("  → Chờ cấp phát",         Prescription.objects.filter(status="pending").count())
        row("  → Đã cấp phát",          Prescription.objects.filter(status="dispensed").count())
        row("Giao dịch thanh toán",     Payment.objects.count())
        row("  → Thành công",           Payment.objects.filter(status="success").count())
        row("  → Chờ TT",               Payment.objects.filter(status="pending").count())
        self.stdout.write(sep)
        row("Thông báo (tổng)",         Notification.objects.count())
        row("  → Chưa đọc",             Notification.objects.filter(is_read=False).count())
        self.stdout.write("=" * w)

        self.stdout.write("\n📌 Tài khoản test:\n")
        # self.stdout.write(f"  admin@clinic.test        / Admin@1234  (admin)")
        for i in range(1, min(3, n_doctors + 1)):
            self.stdout.write(f"  doctor{i}@clinic.test      / Test@1234   (bác sĩ)")
        for i in range(1, min(3, n_staff + 1)):
            self.stdout.write(f"  staff{i}@clinic.test       / Test@1234   (nhân viên)")
        for i in range(1, min(3, n_patients + 1)):
            self.stdout.write(f"  patient{i}@clinic.test     / Test@1234   (bệnh nhân)")
        self.stdout.write("")