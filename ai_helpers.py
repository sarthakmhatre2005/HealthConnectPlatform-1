import os
import logging
import google.generativeai as genai
from config import GOOGLE_API_KEY

# Configure Google Gemini API
genai.configure(api_key=GOOGLE_API_KEY)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_symptoms(symptoms_list, additional_info=""):
    """
    Analyze patient symptoms using Google's Gemini AI
    
    Args:
        symptoms_list (list): List of symptoms reported by the patient
        additional_info (str): Additional context like age, gender, medical history
        
    Returns:
        dict: Analysis results including possible conditions, severity, and recommendations
    """
    try:
        # Format the symptoms for the AI prompt
        symptoms_text = ", ".join(symptoms_list)
        
        # Create the prompt with medical context
        prompt = f"""
        As a medical diagnostic assistant, analyze these symptoms and provide a structured assessment:
        
        Patient symptoms: {symptoms_text}
        Additional information: {additional_info}
        
        Please provide a structured analysis with the following information:
        1. Possible conditions (list the most likely conditions, starting with the most probable)
        2. Severity assessment (mild, moderate, severe)
        3. Recommended specialist type (what kind of doctor should be consulted)
        4. Immediate actions (what the patient should do now)
        5. When to seek emergency care
        
        Format your response as a JSON object with the following keys:
        "possible_conditions", "severity", "specialist_type", "immediate_actions", "emergency_warning_signs", "disclaimer"
        
        Include a medical disclaimer about the limitations of AI diagnosis.
        """
        
        # Get model
        generation_config = {
            "temperature": 0.4,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 1024,
        }
        
        model = genai.GenerativeModel(
            model_name="gemini-1.0-pro",
            generation_config=generation_config
        )
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Process and return the response
        try:
            # In a production environment, we would parse this JSON properly
            # For now, let's extract the text and do minimal processing
            result_text = response.text
            
            # Simple analysis for demo purposes
            severity = "moderate"
            if any(serious in symptoms_text.lower() for serious in ["severe", "extreme", "unbearable", "chest pain", "difficulty breathing"]):
                severity = "severe"
            elif all(mild in symptoms_text.lower() for mild in ["mild", "slight", "minor"]):
                severity = "mild"
                
            # Determine specialist based on symptoms (simplified logic)
            specialist = "general practitioner"
            if any(s in symptoms_text.lower() for s in ["chest", "heart", "palpitation"]):
                specialist = "cardiologist"
            elif any(s in symptoms_text.lower() for s in ["skin", "rash", "itch"]):
                specialist = "dermatologist"
            elif any(s in symptoms_text.lower() for s in ["stomach", "digestion", "nausea"]):
                specialist = "gastroenterologist"
            elif any(s in symptoms_text.lower() for s in ["head", "migraine", "dizziness"]):
                specialist = "neurologist"
            
            # Format the analysis
            analysis_result = {
                "raw_response": result_text,
                "severity": severity,
                "specialist_type": specialist,
                "immediate_actions": ["Rest", "Stay hydrated", "Take over-the-counter medication if appropriate"],
                "emergency_warning_signs": ["Difficulty breathing", "Severe chest pain", "Sudden confusion", "Uncontrolled bleeding"],
                "disclaimer": "This is not a medical diagnosis. Always consult with a healthcare professional for proper medical advice."
            }
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error processing AI response: {e}")
            return {
                "error": "Failed to process the AI response",
                "severity": "unknown",
                "specialist_type": "general practitioner",
                "immediate_actions": ["Consult with a healthcare professional"],
                "disclaimer": "This system encountered an error. Please consult a healthcare professional."
            }
    
    except Exception as e:
        logger.error(f"Error analyzing symptoms: {e}")
        return {
            "error": "Failed to analyze symptoms",
            "severity": "unknown",
            "specialist_type": "general practitioner",
            "immediate_actions": ["Consult with a healthcare professional"],
            "disclaimer": "This system encountered an error. Please consult a healthcare professional."
        }
