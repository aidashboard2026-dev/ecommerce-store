"""
Developer Utility

This script is intended for backend maintenance only.

It is NOT part of the application.

It should only be executed by authorized developers.

This utility manages the single administrator account directly in the database.
"""

import os
import sys
import re
import getpass
import logging

# Ensure backend directory is in python search path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("manage_admin")

try:
    from app.core.database import SessionLocal
    from app.modules.admins.models import Admin
    from app.modules.settings.models import AdminSecurity
    from app.core.security import get_password_hash
except ImportError as err:
    print(f"Error importing project modules: {err}")
    print("Please make sure you are running this script from the 'backend' directory:")
    print("cd backend && python scripts/manage_admin.py")
    sys.exit(1)

EMAIL_REGEX = re.compile(r"^[^@]+@[^@]+\.[^@]+$")

def get_admin(db):
    admin = db.query(Admin).order_by(Admin.id.asc()).first()
    if not admin:
        print("Error: Administrator account not found in the database.")
        return None
    return admin

def show_admin(db):
    admin = get_admin(db)
    if not admin:
        return
    print("\n=========================================")
    print("Current Administrator")
    print("=========================================")
    print(f"ID:         {admin.id}")
    print(f"Username:   {admin.name}")
    print(f"Email:      {admin.email}")
    print(f"Role:       {admin.role}")
    print(f"Created At: {admin.created_at}")
    print("=========================================\n")

def change_username(db):
    admin = get_admin(db)
    if not admin:
        return
    
    new_username = input("Enter new username: ").strip()
    if not new_username:
        print("Error: Username cannot be empty.")
        return
    
    try:
        admin.name = new_username
        
        # Sync AdminSecurity row if it exists
        security_row = db.query(AdminSecurity).filter(AdminSecurity.admin_id == admin.id).first()
        if security_row:
            security_row.username = new_username
            
        db.commit()
        print("Username updated successfully.")
        logger.info("Admin username updated.")
    except Exception as e:
        db.rollback()
        print(f"Database error occurred: {e}")

def change_email(db):
    admin = get_admin(db)
    if not admin:
        return
    
    new_email = input("Enter new login email: ").strip()
    if not new_email:
        print("Error: Login email cannot be empty.")
        return
    
    if not EMAIL_REGEX.match(new_email):
        print("Error: Invalid email format.")
        return
    
    # Check for duplicate email in other admins (if any)
    existing_email = db.query(Admin).filter(Admin.email == new_email, Admin.id != admin.id).first()
    if existing_email:
        print("Error: Email is already in use by another administrator.")
        return
    
    try:
        admin.email = new_email
        
        # Sync AdminSecurity row if it exists
        security_row = db.query(AdminSecurity).filter(AdminSecurity.admin_id == admin.id).first()
        if security_row:
            security_row.email = new_email
            
        db.commit()
        print("Login email updated successfully.")
        logger.info("Admin email updated.")
    except Exception as e:
        db.rollback()
        print(f"Database error occurred: {e}")

def change_password(db):
    admin = get_admin(db)
    if not admin:
        return
    
    password = getpass.getpass("Enter new password: ")
    if not password:
        print("Error: Password cannot be empty.")
        return
        
    confirm = getpass.getpass("Confirm password: ")
    
    if password != confirm:
        print("Error: Passwords do not match.")
        return
        
    # Minimum validation matching project security rules
    if len(password) < 8:
        print("Error: Password must be at least 8 characters.")
        return
    if not any(c.isupper() for c in password):
        print("Error: Password must contain at least one uppercase letter.")
        return
    if not any(c.islower() for c in password):
        print("Error: Password must contain at least one lowercase letter.")
        return
    if not any(c.isdigit() for c in password):
        print("Error: Password must contain at least one number.")
        return
    if not any(not c.isalnum() for c in password):
        print("Error: Password must contain at least one special character.")
        return
        
    try:
        # Generate password hash using same project function
        hashed = get_password_hash(password)
        admin.password_hash = hashed
        
        db.commit()
        print("Password updated successfully.")
        logger.info("Admin password updated.")
    except Exception as e:
        db.rollback()
        print(f"Database error occurred: {e}")

def main():
    try:
        db = SessionLocal()
    except Exception as e:
        print(f"Database connection failure: {e}")
        sys.exit(1)
        
    try:
        while True:
            print("=========================================")
            print("Single Admin Maintenance Utility")
            print("=========================================")
            print("1. Show Current Admin")
            print("2. Change Username")
            print("3. Change Login Email")
            print("4. Change Password")
            print("5. Exit")
            print("=========================================")
            
            choice = input("Select an option (1-5): ").strip()
            if choice == "1":
                show_admin(db)
            elif choice == "2":
                change_username(db)
            elif choice == "3":
                change_email(db)
            elif choice == "4":
                change_password(db)
            elif choice == "5":
                print("Exiting Single Admin Maintenance Utility.")
                break
            else:
                print("Invalid option. Please choose a number between 1 and 5.")
                print()
    finally:
        db.close()

if __name__ == "__main__":
    main()
