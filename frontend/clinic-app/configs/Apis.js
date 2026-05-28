import axios from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export const endpoints = {
    'register': '/auth/register/',
    'login': '/auth/login/',
    'current-user': '/auth/me/',
    'change-password': '/auth/change-password/',

    'specialties': '/specialties/',
    'services': '/services/',

    'doctors': '/doctors/',
    'doctor-detail': (id) => `/doctors/${id}/`,
    'doctor-schedules': (id) => `/doctors/${id}/schedules/`,
    'doctor-appointments': (id) => `/doctors/${id}/appointments/`,

    'doctor-dashboard': '/doctor/dashboard/',
    'doctor-my-schedules': '/doctor/my-schedules/',
    'doctor-today-appointments': '/doctor/today-appointments/',

    'schedules': '/schedules/',
    'schedule-detail': (id) => `/schedules/${id}/`,

    'staff-dashboard': '/staff/dashboard/',
    'staff-patients': '/staff/patients/',
    'staff-patient-detail': (id) => `/staff/patients/${id}/`,
    'staff-payments': '/staff/payments/',
    'staff-inventory-alerts': '/staff/inventory-alerts/',

    'appointments': '/appointments/',
    'appointment-detail': (id) => `/appointments/${id}/`,
    'appointment-status': (id) => `/appointments/${id}/status/`,
    'appointment-add-service': (id) => `/appointments/${id}/add_service/`,

    'medical-records': '/medical-records/',
    'medical-record-detail': (id) => `/medical-records/${id}/`,
    'medical-record-add-test': (id) => `/medical-records/${id}/add_test_result/`,

    'test-results': '/test-results/',
    'test-result-detail': (id) => `/test-results/${id}/`,

    'prescriptions': '/prescriptions/',
    'prescription-detail': (id) => `/prescriptions/${id}/`,
    'prescription-dispense': (id) => `/prescriptions/${id}/dispense/`,
    'prescription-add-medicine': (id) => `/prescriptions/${id}/add_medicine/`,

    'payments': '/payments/',
    'payment-init': '/payments/init/',
    'payment-confirm': (id) => `/payments/${id}/confirm/`,
    'payment-detail': (id) => `/payments/${id}/`,
    'momo-return':     '/payments/momo/return/',
    'vnpay-return':    '/payments/vnpay/return/',
    'vnpay-ipn':       '/payments/vnpay/ipn/',
    'payment-simulate': (id) => `/payments/${id}/simulate/`,

    'medicine-categories': '/medicine-categories/',
    'medicines': '/medicines/',
    'inventory': '/inventory/',
    'inventory-detail': (id) => `/inventory/${id}/`,
    'inventory-low-stock': '/inventory/low_stock/',
    'inventory-near-expiry': '/inventory/near_expiry/',
    'inventory-alerts': '/inventory-alerts/',
    'inventory-alert-resolve': (id) => `/inventory-alerts/${id}/resolve/`,
    'inventory-dispose': (id) => `/inventory/${id}/dispose/`,

    'notifications': '/notifications/',
    'notification-read': (id) => `/notifications/${id}/read/`,
    'notification-read-all': '/notifications/read_all/',

    'patients': '/patients/',
    'patient-detail': (id) => `/patients/${id}/`,
    'patient-appointments': (id) => `/patients/${id}/appointments/`,
    'patient-medical-records': (id) => `/patients/${id}/medical_records/`,

    'consultations': '/consultations/',
    'consultation-detail': (id) => `/consultations/${id}/`,
    'consultation-enter': (id) => `/consultations/${id}/enter/`,
    'consultation-start': (id) => `/consultations/${id}/start/`,
    'consultation-end': (id) => `/consultations/${id}/end/`,
    'consultation-messages': (id) => `/consultations/${id}/messages/`,
    'consultation-rtm-token': (id) => `/consultations/${id}/rtm-token/`,

    'admin-dashboard': '/admin/dashboard/',
    'admin-reports': '/admin/dashboard/reports/',
};

export const authApis = (token) => {
    return axios.create({
        baseURL: BASE_URL,
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
};

export default axios.create({
    baseURL: BASE_URL
});