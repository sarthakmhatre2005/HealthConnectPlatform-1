import json
import logging
import os
import uuid
from datetime import datetime, date, time, timedelta
from flask import render_template, request, redirect, url_for, flash, session, jsonify, abort
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from app import app, db
from models import User, Patient, Doctor, Appointment, Notification, SymptomCheck, Hospital
from ai_helpers import analyze_symptoms
from config import MAPS_API_KEY

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Helper functions
def create_notification(user_id, title, message, notification_type=None, related_id=None):
    """Create a notification for a user"""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_id=related_id
    )
    db.session.add(notification)
    db.session.commit()
    return notification

def get_unread_notification_count(user_id):
    """Get count of unread notifications for a user"""
    return Notification.query.filter_by(user_id=user_id, read=False).count()

# Routes
@app.route('/')
def home():
    return render_template('home.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        name = request.form.get('name')
        user_type = request.form.get('user_type')
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email already registered. Please log in.', 'warning')
            return redirect(url_for('login'))
        
        # Create new user
        new_user = User(
            email=email,
            name=name,
            user_type=user_type
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        # Create patient or doctor profile
        if user_type == 'patient':
            patient = Patient(user_id=new_user.id)
            db.session.add(patient)
        else:  # user_type == 'doctor'
            specialization = request.form.get('specialization', 'General Practitioner')
            doctor = Doctor(
                user_id=new_user.id,
                specialization=specialization
            )
            db.session.add(doctor)
        
        db.session.commit()
        
        # Create welcome notification
        create_notification(
            new_user.id, 
            "Welcome to HealthConnect!", 
            f"Thank you for registering with HealthConnect. We're excited to help you manage your healthcare journey."
        )
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user)
            session['user_id'] = user.id
            session['user_type'] = user.user_type
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password. Please try again.', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    session.pop('user_id', None)
    session.pop('user_type', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('home'))

@app.route('/dashboard')
@login_required
def dashboard():
    user_data = User.query.get(current_user.id)
    user_type = current_user.user_type
    notification_count = get_unread_notification_count(current_user.id)
    
    if user_type == 'patient':
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        
        # Get upcoming appointments
        appointments = (Appointment.query
                        .filter_by(patient_id=patient.id)
                        .filter(Appointment.status.in_(['scheduled', 'pending']))
                        .filter(Appointment.date >= date.today())
                        .order_by(Appointment.date, Appointment.time)
                        .all())
        
        # Get symptom checks
        symptom_checks = (SymptomCheck.query
                         .filter_by(patient_id=patient.id)
                         .order_by(SymptomCheck.created_at.desc())
                         .limit(5)
                         .all())
        
        return render_template(
            'dashboard.html',
            user_data=user_data,
            user_type=user_type,
            appointments=appointments,
            symptom_checks=symptom_checks,
            notification_count=notification_count
        )
    else:  # doctor
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        
        # Get upcoming appointments
        appointments = (Appointment.query
                       .filter_by(doctor_id=doctor.id)
                       .filter(Appointment.status.in_(['scheduled', 'pending']))
                       .filter(Appointment.date >= date.today())
                       .order_by(Appointment.date, Appointment.time)
                       .all())
        
        return render_template(
            'dashboard.html',
            user_data=user_data,
            user_type=user_type,
            appointments=appointments,
            notification_count=notification_count
        )

@app.route('/appointments')
@login_required
def appointments():
    user_type = current_user.user_type
    notification_count = get_unread_notification_count(current_user.id)
    
    if user_type == 'patient':
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        appointments = Appointment.query.filter_by(patient_id=patient.id).all()
    else:  # doctor
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        appointments = Appointment.query.filter_by(doctor_id=doctor.id).all()
    
    return render_template(
        'appointments.html',
        user_type=user_type,
        appointments=appointments,
        notification_count=notification_count
    )

@app.route('/book-appointment', methods=['GET', 'POST'])
@login_required
def book_appointment():
    if current_user.user_type != 'patient':
        flash('Only patients can book appointments.', 'warning')
        return redirect(url_for('dashboard'))
    
    notification_count = get_unread_notification_count(current_user.id)
    
    # Get all doctors for selection
    doctors = Doctor.query.all()
    
    # Check if a specific doctor was selected from doctor finder
    selected_doctor = None
    if request.args.get('doctor_id'):
        selected_doctor = Doctor.query.get(request.args.get('doctor_id'))
    
    if request.method == 'POST':
        doctor_id = request.form.get('doctor_id')
        appointment_date = request.form.get('date')
        appointment_time = request.form.get('time')
        reason = request.form.get('reason')
        
        # Validate inputs
        if not all([doctor_id, appointment_date, appointment_time]):
            flash('Please fill all required fields.', 'danger')
            return redirect(url_for('book_appointment'))
        
        # Parse date and time
        try:
            parsed_date = datetime.strptime(appointment_date, '%Y-%m-%d').date()
            parsed_time = datetime.strptime(appointment_time, '%H:%M').time()
            
            # Check if date is in the past
            if parsed_date < date.today():
                flash('Cannot book appointments in the past.', 'danger')
                return redirect(url_for('book_appointment'))
        except ValueError:
            flash('Invalid date or time format.', 'danger')
            return redirect(url_for('book_appointment'))
        
        # Create appointment
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        
        new_appointment = Appointment(
            patient_id=patient.id,
            doctor_id=doctor_id,
            date=parsed_date,
            time=parsed_time,
            reason=reason,
            status='pending'  # Default to pending until doctor approves
        )
        
        db.session.add(new_appointment)
        db.session.commit()
        
        # Notify the doctor
        doctor = Doctor.query.get(doctor_id)
        create_notification(
            doctor.user_id,
            "New Appointment Request",
            f"You have a new appointment request from {patient.user.name} for {parsed_date.strftime('%B %d, %Y')} at {parsed_time.strftime('%I:%M %p')}.",
            "appointment",
            new_appointment.id
        )
        
        flash('Appointment request submitted successfully! Waiting for doctor approval.', 'success')
        return redirect(url_for('appointments'))
    
    return render_template(
        'book_appointment.html',
        doctors=doctors,
        selected_doctor=selected_doctor,
        notification_count=notification_count
    )

@app.route('/appointment/update-status', methods=['POST'])
@login_required
def update_appointment_status():
    appointment_id = request.form.get('appointment_id')
    new_status = request.form.get('status')
    notes = request.form.get('notes', '')
    
    if not all([appointment_id, new_status]):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    # Get appointment
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'success': False, 'message': 'Appointment not found'}), 404
    
    # Verify user has permission to update
    user_type = current_user.user_type
    if user_type == 'doctor' and appointment.doctor.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'You do not have permission to update this appointment'}), 403
    elif user_type == 'patient' and appointment.patient.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'You do not have permission to update this appointment'}), 403
    
    # Update appointment status
    appointment.status = new_status
    if notes:
        appointment.notes = notes
    
    db.session.commit()
    
    # Create notification for the other party
    if user_type == 'doctor':
        recipient_id = appointment.patient.user_id
        if new_status == 'approved':
            message = f"Your appointment with Dr. {appointment.doctor.user.name} on {appointment.date.strftime('%B %d, %Y')} at {appointment.time.strftime('%I:%M %p')} has been approved."
            notification_title = "Appointment Approved"
        elif new_status == 'rejected':
            message = f"Your appointment with Dr. {appointment.doctor.user.name} on {appointment.date.strftime('%B %d, %Y')} at {appointment.time.strftime('%I:%M %p')} has been rejected. Reason: {notes}"
            notification_title = "Appointment Rejected"
        else:
            message = f"Your appointment with Dr. {appointment.doctor.user.name} has been updated to status: {new_status}."
            notification_title = "Appointment Updated"
    else:  # patient
        recipient_id = appointment.doctor.user_id
        if new_status == 'cancelled':
            message = f"The appointment with {appointment.patient.user.name} on {appointment.date.strftime('%B %d, %Y')} at {appointment.time.strftime('%I:%M %p')} has been cancelled by the patient."
            notification_title = "Appointment Cancelled"
        else:
            message = f"The appointment with {appointment.patient.user.name} has been updated to status: {new_status}."
            notification_title = "Appointment Updated"
    
    create_notification(recipient_id, notification_title, message, "appointment", appointment.id)
    
    return jsonify({
        'success': True, 
        'message': f'Appointment status updated to {new_status}',
        'new_status': new_status
    })

@app.route('/doctor-finder')
def doctor_finder():
    # Get optional specialization filter from URL query parameter
    specialization = request.args.get('specialization', '')
    
    # Get all doctors, filtered by specialization if provided
    if specialization:
        doctors = Doctor.query.filter(Doctor.specialization.ilike(f'%{specialization}%')).all()
    else:
        doctors = Doctor.query.all()
    
    # Get notification count if user is logged in
    notification_count = 0
    if current_user.is_authenticated:
        notification_count = get_unread_notification_count(current_user.id)
    
    return render_template(
        'find_doctors.html',
        doctors=doctors,
        specialization=specialization,
        notification_count=notification_count,
        maps_api_key=MAPS_API_KEY
    )

@app.route('/hospital-finder')
def hospital_finder():
    # Get all hospitals
    hospitals = Hospital.query.all()
    
    # Get notification count if user is logged in
    notification_count = 0
    if current_user.is_authenticated:
        notification_count = get_unread_notification_count(current_user.id)
    
    return render_template(
        'find_hospitals.html',
        hospitals=hospitals,
        notification_count=notification_count,
        maps_api_key=MAPS_API_KEY
    )

@app.route('/symptom-checker', methods=['GET', 'POST'])
@login_required
def symptom_checker():
    if current_user.user_type != 'patient':
        flash('Only patients can access the symptom checker.', 'warning')
        return redirect(url_for('dashboard'))
    
    notification_count = get_unread_notification_count(current_user.id)
    
    if request.method == 'POST':
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        
        # Get input data
        symptoms = request.form.getlist('symptoms[]')
        duration = request.form.get('duration')
        severity = request.form.get('severity')
        additional_info = request.form.get('additional_info', '')
        
        # Create additional context
        context = f"Duration: {duration}. Severity: {severity}. Additional info: {additional_info}"
        
        # Call AI to analyze symptoms
        analysis_result = analyze_symptoms(symptoms, context)
        
        # Save symptom check to database
        symptom_check = SymptomCheck(
            patient_id=patient.id,
            symptoms=json.dumps(symptoms),
            analysis=json.dumps(analysis_result),
            severity=analysis_result.get('severity', 'unknown'),
            recommendations=json.dumps(analysis_result.get('immediate_actions', []))
        )
        db.session.add(symptom_check)
        db.session.commit()
        
        # Create notification
        create_notification(
            current_user.id,
            "Symptom Analysis Complete",
            f"Your symptom analysis is ready. Recommended specialist: {analysis_result.get('specialist_type', 'general practitioner')}.",
            "symptom_check",
            symptom_check.id
        )
        
        # If severe, suggest immediate medical attention
        if analysis_result.get('severity') == 'severe':
            flash('Your symptoms may require immediate medical attention. Please consult a healthcare professional as soon as possible.', 'danger')
        
        # Redirect to results page with the symptom check ID
        return redirect(url_for('symptom_results', check_id=symptom_check.id))
    
    return render_template(
        'symptom_checker.html',
        notification_count=notification_count
    )

@app.route('/symptom-results/<int:check_id>')
@login_required
def symptom_results(check_id):
    if current_user.user_type != 'patient':
        flash('Only patients can view symptom check results.', 'warning')
        return redirect(url_for('dashboard'))
    
    # Get the symptom check
    symptom_check = SymptomCheck.query.get_or_404(check_id)
    
    # Verify the current user owns this symptom check
    patient = Patient.query.filter_by(user_id=current_user.id).first()
    if symptom_check.patient_id != patient.id:
        flash('You do not have permission to view this symptom check.', 'danger')
        return redirect(url_for('dashboard'))
    
    # Parse the JSON data
    symptoms = json.loads(symptom_check.symptoms)
    analysis = json.loads(symptom_check.analysis)
    recommendations = json.loads(symptom_check.recommendations) if symptom_check.recommendations else []
    
    # Get relevant doctors based on specialist recommendation
    specialist_type = analysis.get('specialist_type', '').lower()
    recommended_doctors = Doctor.query.filter(Doctor.specialization.ilike(f'%{specialist_type}%')).all()
    
    # Get notification count
    notification_count = get_unread_notification_count(current_user.id)
    
    return render_template(
        'symptom_results.html',
        symptom_check=symptom_check,
        symptoms=symptoms,
        analysis=analysis,
        recommendations=recommendations,
        recommended_doctors=recommended_doctors,
        notification_count=notification_count
    )

@app.route('/notifications')
@login_required
def notifications():
    # Get all notifications for the current user
    user_notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).all()
    
    # Get unread count for the navbar
    notification_count = get_unread_notification_count(current_user.id)
    
    return render_template(
        'notifications.html',
        notifications=user_notifications,
        notification_count=notification_count
    )

@app.route('/api/notifications/mark-read', methods=['POST'])
@login_required
def mark_notification_read():
    try:
        data = request.get_json()
        notification_id = data.get('notification_id')
        
        if not notification_id:
            return jsonify({'success': False, 'message': 'Notification ID is required'}), 400
        
        notification = Notification.query.get(notification_id)
        
        if not notification:
            return jsonify({'success': False, 'message': 'Notification not found'}), 404
        
        # Check if the notification belongs to the current user
        if notification.user_id != current_user.id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        notification.read = True
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Notification marked as read'})
    
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/api/notifications/delete', methods=['POST'])
@login_required
def delete_notification():
    try:
        data = request.get_json()
        notification_id = data.get('notification_id')
        
        if not notification_id:
            return jsonify({'success': False, 'message': 'Notification ID is required'}), 400
        
        notification = Notification.query.get(notification_id)
        
        if not notification:
            return jsonify({'success': False, 'message': 'Notification not found'}), 404
        
        # Check if the notification belongs to the current user
        if notification.user_id != current_user.id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        db.session.delete(notification)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Notification deleted successfully'})
    
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/api/notifications/mark-all-read', methods=['POST'])
@login_required
def mark_all_notifications_read():
    try:
        # Get all unread notifications for the current user
        unread_notifications = Notification.query.filter_by(user_id=current_user.id, read=False).all()
        
        # Mark all as read
        for notification in unread_notifications:
            notification.read = True
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'All notifications marked as read'})
    
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/api/notifications/clear-all', methods=['POST'])
@login_required
def clear_all_notifications():
    try:
        # Get all notifications for the current user
        user_notifications = Notification.query.filter_by(user_id=current_user.id).all()
        
        # Delete all notifications
        for notification in user_notifications:
            db.session.delete(notification)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'All notifications cleared'})
    
    except Exception as e:
        logger.error(f"Error clearing all notifications: {e}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    user = User.query.get(current_user.id)
    notification_count = get_unread_notification_count(current_user.id)
    
    if current_user.user_type == 'patient':
        profile_data = Patient.query.filter_by(user_id=current_user.id).first()
    else:
        profile_data = Doctor.query.filter_by(user_id=current_user.id).first()
    
    if request.method == 'POST':
        # Update user data
        user.name = request.form.get('name')
        
        # Update profile specific data
        if current_user.user_type == 'patient':
            profile_data.date_of_birth = datetime.strptime(request.form.get('date_of_birth'), '%Y-%m-%d').date() if request.form.get('date_of_birth') else None
            profile_data.gender = request.form.get('gender')
            profile_data.blood_group = request.form.get('blood_group')
            profile_data.address = request.form.get('address')
            profile_data.city = request.form.get('city')
            profile_data.state = request.form.get('state')
            profile_data.phone = request.form.get('phone')
            profile_data.emergency_contact = request.form.get('emergency_contact')
        else:
            profile_data.specialization = request.form.get('specialization')
            profile_data.bio = request.form.get('bio')
            profile_data.experience_years = int(request.form.get('experience_years')) if request.form.get('experience_years') else None
            profile_data.address = request.form.get('address')
            profile_data.city = request.form.get('city')
            profile_data.state = request.form.get('state')
            profile_data.phone = request.form.get('phone')
            profile_data.latitude = float(request.form.get('latitude')) if request.form.get('latitude') else None
            profile_data.longitude = float(request.form.get('longitude')) if request.form.get('longitude') else None
            profile_data.available_days = request.form.get('available_days')
            profile_data.available_hours = request.form.get('available_hours')
        
        db.session.commit()
        flash('Profile updated successfully!', 'success')
        return redirect(url_for('profile'))
    
    return render_template(
        'profile.html',
        user=user,
        profile_data=profile_data,
        user_type=current_user.user_type,
        notification_count=notification_count
    )

@app.route('/api/doctor-availability', methods=['GET'])
def doctor_availability():
    doctor_id = request.args.get('doctor_id')
    selected_date = request.args.get('date')
    
    if not all([doctor_id, selected_date]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # Parse the date
    try:
        parsed_date = datetime.strptime(selected_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Get the doctor
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({'error': 'Doctor not found'}), 404
    
    # Get the day of week
    day_of_week = parsed_date.strftime('%a')
    
    # Check if doctor works on this day
    if doctor.available_days and day_of_week not in doctor.available_days.split(','):
        return jsonify({
            'available': False,
            'message': f'Doctor does not work on {parsed_date.strftime("%A")}s',
            'available_slots': []
        })
    
    # Get doctor's available hours
    available_hours = {}
    if doctor.available_hours:
        try:
            available_hours = json.loads(doctor.available_hours)
        except:
            # Default hours if parsing fails
            available_hours = {"start": "09:00", "end": "17:00"}
    else:
        # Default hours if none specified
        available_hours = {"start": "09:00", "end": "17:00"}
    
    # Get existing appointments for the selected day
    existing_appointments = Appointment.query.filter(
        Appointment.doctor_id == doctor_id,
        Appointment.date == parsed_date,
        Appointment.status.in_(['pending', 'scheduled'])
    ).all()
    
    # Extract the times of existing appointments
    booked_times = [appt.time.strftime('%H:%M') for appt in existing_appointments]
    
    # Generate available time slots (30-minute intervals)
    start_time = datetime.strptime(available_hours.get("start", "09:00"), '%H:%M')
    end_time = datetime.strptime(available_hours.get("end", "17:00"), '%H:%M')
    
    available_slots = []
    current_slot = start_time
    
    while current_slot < end_time:
        time_str = current_slot.strftime('%H:%M')
        if time_str not in booked_times:
            available_slots.append({
                'value': time_str,
                'display': current_slot.strftime('%I:%M %p')
            })
        current_slot += timedelta(minutes=30)
    
    return jsonify({
        'available': len(available_slots) > 0,
        'message': f'{len(available_slots)} time slots available' if available_slots else 'No available slots on this day',
        'available_slots': available_slots
    })

@app.context_processor
def inject_notification_count():
    """Inject notification count into all templates"""
    count = 0
    if current_user.is_authenticated:
        count = get_unread_notification_count(current_user.id)
    return {'notification_count': count}

# Main app entry point
def main():
    app.run(host='0.0.0.0', port=5000, debug=True)

if __name__ == '__main__':
    main()
