import axios from "axios";

// Thay IP này bằng IP máy tính đang chạy Django (xem bằng ipconfig/ifconfig)
// const BASE_URL = "http://10.0.2.2:8000/";
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export const endpoints = {
    // Auth
    'register': '/auth/register/',
    'login': 'auth/login',
    'current-user': '/auth/me/',
    'change-password': '/auth/change-password/',

    // Specialties & Services
    'specialties': '/specialties/',
    'services': '/services/',

    // Doctors
    'doctors': '/doctors/',
    'doctor-detail': (id) => `/doctors/${id}/`,
    'doctor-schedules': (id) => `/doctors/${id}/schedules/`,

    // Appointments
    'appointments': '/appointments/',
    'appointment-detail': (id) => `/appointments/${id}/`,
    'appointment-status': (id) => `/appointments/${id}/update_status/`,

    // Medical Records
    'medical-records': '/medical-records/',
    'medical-record-detail': (id) => `/medical-records/${id}/`,

    // Prescriptions
    'prescriptions': '/prescriptions/',
    'prescription-detail': (id) => `/prescriptions/${id}/`,

    // Payments
    'payments': '/payments/',
    'payment-init': '/payments/init/',
    'payment-confirm': (id) => `/payments/${id}/confirm/`,

    // Notifications
    'notifications': '/notifications/',
    'notification-read': (id) => `/notifications/${id}/read/`,
    'notification-read-all': '/notifications/read-all/',

    // Patients
    'patients': '/patients/',
    'patient-detail': (id) => `/patients/${id}/`,
    'patient-appointments': (id) => `/patients/${id}/appointments/`,
    'patient-medical-records': (id) => `/patients/${id}/medical_records/`,

    // Consultations
    'consultations': '/consultations/',
    'consultation-detail': (id) => `/consultations/${id}/`,
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
