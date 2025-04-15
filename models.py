from datetime import datetime
from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    user_type = db.Column(db.String(10), nullable=False)  # 'patient' or 'doctor'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    patient_data = db.relationship('Patient', backref='user', uselist=False)
    doctor_data = db.relationship('Doctor', backref='user', uselist=False)
    notifications = db.relationship('Notification', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.email}>'

class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(10))
    blood_group = db.Column(db.String(5))
    address = db.Column(db.String(200))
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    phone = db.Column(db.String(15))
    emergency_contact = db.Column(db.String(15))
    
    # Relationships
    appointments = db.relationship('Appointment', backref='patient', lazy='dynamic', 
                                   foreign_keys='Appointment.patient_id')
    symptom_checks = db.relationship('SymptomCheck', backref='patient', lazy='dynamic')
    
    def __repr__(self):
        return f'<Patient {self.user.name}>'

class Doctor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    specialization = db.Column(db.String(50), nullable=False)
    bio = db.Column(db.Text)
    license_number = db.Column(db.String(50))
    experience_years = db.Column(db.Integer)
    address = db.Column(db.String(200))
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    phone = db.Column(db.String(15))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    
    # Availability days (CSV string: "Mon,Tue,Wed")
    available_days = db.Column(db.String(100))
    # Availability times (JSON string: {"start": "09:00", "end": "17:00"})
    available_hours = db.Column(db.String(100))
    
    # Relationships
    appointments = db.relationship('Appointment', backref='doctor', lazy='dynamic',
                                   foreign_keys='Appointment.doctor_id')
    
    def __repr__(self):
        return f'<Doctor {self.user.name} ({self.specialization})>'

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time, nullable=False)
    reason = db.Column(db.Text)
    status = db.Column(db.String(15), default='pending')  # pending, scheduled, completed, cancelled, rejected
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Appointment {self.id}: {self.patient.user.name} with Dr. {self.doctor.user.name} on {self.date}>'

class SymptomCheck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    symptoms = db.Column(db.Text, nullable=False)  # JSON string of symptoms
    analysis = db.Column(db.Text)  # AI analysis result
    recommendations = db.Column(db.Text)  # JSON string of recommendations
    severity = db.Column(db.String(20))  # mild, moderate, severe
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<SymptomCheck {self.id} by {self.patient.user.name}>'

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    read = db.Column(db.Boolean, default=False)
    notification_type = db.Column(db.String(20))  # appointment, symptom_check, etc.
    related_id = db.Column(db.Integer)  # Related entity ID (e.g., appointment_id)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Notification {self.id} for {self.user.name}>'

class Hospital(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200))
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    phone = db.Column(db.String(15))
    email = db.Column(db.String(120))
    website = db.Column(db.String(120))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    description = db.Column(db.Text)
    specialties = db.Column(db.String(200))  # CSV string of specialties
    emergency_services = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f'<Hospital {self.name}>'
