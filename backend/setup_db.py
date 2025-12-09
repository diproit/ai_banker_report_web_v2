"""
setup_db.py
Standalone script to create all tables and insert seed data for ai_banker_report_web.
Run: python setup_db.py
"""
import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, Session, text, select
from config.database import get_engine
from models.it_language import ItLanguage
from models.it_nav_menu import ItNavMenu
from models.it_user_nav_rights import ItUserNavRights
from models.it_prompt_master import ItPromptMaster
from models.it_report_structures import ItReportStructure
from models.it_report_config import ItReportConfig
from models.it_report_design import ItReportDesign
from models.it_user_master import ItUserMaster, UserRole
import datetime

# Load environment variables
load_dotenv()

def create_tables():
    engine = get_engine()
    
    try:
        SQLModel.metadata.create_all(engine)
        print("All tables created/verified (existing tables skipped).")
    except Exception as e:
        print(f"Error during table creation: {e}")
        
        # Fallback: Create tables individually, skipping it_user_master
        tables_to_create = [
            table for table in SQLModel.metadata.tables.values() 
            if table.name != 'it_user_master'
        ]
        
        SQLModel.metadata.create_all(engine, tables=tables_to_create)
        print(f"Created {len(tables_to_create)} new tables (excluding existing it_user_master).")

def alter_user_master_table():
    """Add user_role column to it_user_master table if it doesn't exist"""
    engine = get_engine()
    with Session(engine) as session:
        try:
            # Check if user_role column exists by trying to query it
            session.exec(text("SELECT user_role FROM it_user_master LIMIT 1"))
            print("user_role column already exists in it_user_master table.")
        except Exception:
            # Column doesn't exist, add it
            try:
                session.exec(text("""
                    ALTER TABLE it_user_master
                    ADD COLUMN user_role ENUM('ADMIN', 'FIELD_OFFICER', 'CLERK', 'BRANCH_MANAGER', 'CASHIER') DEFAULT 'CLERK'
                """))
                session.commit()
                print("user_role column added to it_user_master table.")
            except Exception as e:
                print(f"Error adding user_role column: {e}")
                session.rollback()

def setup_admin_user(admin_user_id: int = 1):
    """Set up an admin user with full navigation rights"""
    engine = get_engine()
    now = datetime.datetime.now()
    with Session(engine) as session:
        try:
            # Check if user exists
            admin_user = session.get(ItUserMaster, admin_user_id)
            if not admin_user:
                print(f"User with ID {admin_user_id} not found. Please create the user first.")
                return
            
            # Update user role to ADMIN
            admin_user.user_role = UserRole.ADMIN
            admin_user.m_at = now
            admin_user.m_by = admin_user_id  # Modified by themselves
            
            # Check and assign navigation rights
            for nav_menu_id in [1, 2, 3]:
                # Check if nav right already exists
                existing_right = session.exec(
                    select(ItUserNavRights).where(
                        ItUserNavRights.user_id == admin_user_id,
                        ItUserNavRights.nav_menu_id == nav_menu_id
                    )
                ).first()
                
                if not existing_right:
                    nav_right = ItUserNavRights(
                        user_id=admin_user_id,
                        nav_menu_id=nav_menu_id,
                        can_view=True,
                        created_at=now,
                        updated_at=now,
                        is_active=True
                    )
                    session.add(nav_right)
            
            session.commit()
            print(f"Admin user setup complete for user ID {admin_user_id}")
            
        except Exception as e:
            print(f"Error setting up admin user: {e}")
            session.rollback()

def insert_seed_data():
    engine = get_engine()
    now = datetime.datetime.now()
    with Session(engine) as session:
        # it_language
        for lang in [
            dict(id=1, language='english', display_name='English'),
            dict(id=2, language='sinhala', display_name='සිංහල'),
            dict(id=3, language='tamil', display_name='தமிழ்'),
            dict(id=4, language='tagalog', display_name='Tagalog'),
            dict(id=5, language='thai', display_name='ไทย'),
        ]:
            exists = session.get(ItLanguage, lang['id'])
            if not exists:
                session.add(ItLanguage(id=lang['id'], language=lang['language'], display_name=lang['display_name'], created_at=now, updated_at=now, is_active=True))

        # it_nav_menu
        for nav in [
            dict(id=1, title='Dashboard', title_si='උපකරණ පුවරුව', title_ta='கட்டுப்பாட்டு பலகை', title_tl='Dashboard', title_th='แดชบอร์ด', url='/dashboard', sort_order=0),
            dict(id=2, title='AI Analytics', title_si='AI විශ්ලේෂණ', title_ta='AI பகுப்பாய்வு', title_tl='AI Analytics', title_th='การวิเคราะห์ AI', url='/ai-analytics', sort_order=1),
            dict(id=3, title='User Rights', title_si='පරිශීලක අයිතිවාසිකම්', title_ta='பயனர் உரிமைகள்', title_tl='Mga Karapatan ng User', title_th='สิทธิ์ผู้ใช้', url='/user-rights', sort_order=2),
        ]:
            exists = session.get(ItNavMenu, nav['id'])
            if not exists:
                session.add(ItNavMenu(
                    id=nav['id'], title=nav['title'], title_si=nav['title_si'], title_ta=nav['title_ta'],
                    title_tl=nav['title_tl'], title_th=nav['title_th'], url=nav['url'], parent_id=None, level=0, path=f"/{nav['id']}/", group_name=None, sort_order=nav['sort_order'], it_report_structures_id=None, has_children=False, created_at=now, updated_at=now, is_active=True
                ))

        # it_prompt_master
        prompt_seed = [
            # System Prompt
            dict(id=1, prompt_text=None, prompt='You are an expert in micro finance and cooperative credit unions. You have a deep understanding of the micro finance institutions and cooperative credit unions, like "Co-operative banks" etc. Your task is to answer various decision making questions by management. IMPORTANT LANGUAGE INSTRUCTION: Always respond in the {language} language.', prompt_type='system', prompt_query=None, note=None, sort_order=0, has_placeholders=True, language_code='english'),
            # Loan Past Due prompts
            dict(id=2, prompt_text='Loan past due', prompt='Analyze this loan past due situation. Total loan balance = {total_loan_balance}, Number of loan accounts = {total_loan_accounts}, Total past due amount = {total_loan_past_due_balance}, Past due account count = {total_past_due_loan_accounts}.', prompt_type='user', prompt_query='SELECT COALESCE(SUM(pa.balance),0) AS total_loan_balance, COALESCE(SUM(pa.past_due_amount),0) AS total_loan_past_due_balance, COALESCE(COUNT(pa.id),0) AS total_loan_accounts, COALESCE(COUNT(CASE WHEN pa.past_due_amount > 0 THEN pa.id END),0) AS total_past_due_loan_accounts FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pat.pl_account_category_id = 2 AND pa.status = 1;', note=None, sort_order=1, has_placeholders=True, language_code='english'),
            dict(id=3, prompt_text='ණය කල්පසු', prompt='Analyze this loan past due situation. Total loan balance = {total_loan_balance}, Number of loan accounts = {total_loan_accounts}, Total past due amount = {total_loan_past_due_balance}, Past due account count = {total_past_due_loan_accounts}.', prompt_type='user', prompt_query='SELECT COALESCE(SUM(pa.balance),0) AS total_loan_balance, COALESCE(SUM(pa.past_due_amount),0) AS total_loan_past_due_balance, COALESCE(COUNT(pa.id),0) AS total_loan_accounts, COALESCE(COUNT(CASE WHEN pa.past_due_amount > 0 THEN pa.id END),0) AS total_past_due_loan_accounts FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pat.pl_account_category_id = 2 AND pa.status = 1;', note=None, sort_order=1, has_placeholders=True, language_code='sinhala'),
            dict(id=4, prompt_text='கடன் தாமதம்', prompt='Analyze this loan past due situation. Total loan balance = {total_loan_balance}, Number of loan accounts = {total_loan_accounts}, Total past due amount = {total_loan_past_due_balance}, Past due account count = {total_past_due_loan_accounts}.', prompt_type='user', prompt_query='SELECT COALESCE(SUM(pa.balance),0) AS total_loan_balance, COALESCE(SUM(pa.past_due_amount),0) AS total_loan_past_due_balance, COALESCE(COUNT(pa.id),0) AS total_loan_accounts, COALESCE(COUNT(CASE WHEN pa.past_due_amount > 0 THEN pa.id END),0) AS total_past_due_loan_accounts FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pat.pl_account_category_id = 2 AND pa.status = 1;', note=None, sort_order=1, has_placeholders=True, language_code='tamil'),
            dict(id=5, prompt_text='Nakaraang utang', prompt='Analyze this loan past due situation. Total loan balance = {total_loan_balance}, Number of loan accounts = {total_loan_accounts}, Total past due amount = {total_loan_past_due_balance}, Past due account count = {total_past_due_loan_accounts}.', prompt_type='user', prompt_query='SELECT COALESCE(SUM(pa.balance),0) AS total_loan_balance, COALESCE(SUM(pa.past_due_amount),0) AS total_loan_past_due_balance, COALESCE(COUNT(pa.id),0) AS total_loan_accounts, COALESCE(COUNT(CASE WHEN pa.past_due_amount > 0 THEN pa.id END),0) AS total_past_due_loan_accounts FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pat.pl_account_category_id = 2 AND pa.status = 1;', note=None, sort_order=1, has_placeholders=True, language_code='tagalog'),
            dict(id=6, prompt_text='เงินกู้ค้างชำระ', prompt='Analyze this loan past due situation. Total loan balance = {total_loan_balance}, Number of loan accounts = {total_loan_accounts}, Total past due amount = {total_loan_past_due_balance}, Past due account count = {total_past_due_loan_accounts}.', prompt_type='user', prompt_query='SELECT COALESCE(SUM(pa.balance),0) AS total_loan_balance, COALESCE(SUM(pa.past_due_amount),0) AS total_loan_past_due_balance, COALESCE(COUNT(pa.id),0) AS total_loan_accounts, COALESCE(COUNT(CASE WHEN pa.past_due_amount > 0 THEN pa.id END),0) AS total_past_due_loan_accounts FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pat.pl_account_category_id = 2 AND pa.status = 1;', note=None, sort_order=1, has_placeholders=True, language_code='thai'),
            # Customer Rating prompts
            dict(id=7, prompt_text='Rate this customer: {customer_id}', prompt="Rate this customer's ability to obtain an another loan but currently the customer has {total_balance} as a loan balance and has {total_due_interest} as past due interest.", prompt_type='user', prompt_query="SELECT c.id, c.full_name_ln1, c.customer_number, COALESCE(SUM(p.balance), 0) AS total_balance, COALESCE(SUM(p.due_interest), 0) AS total_due_interest FROM ci_customer c LEFT JOIN pl_account p ON c.id = p.ci_customer_id WHERE c.customer_number = '{customer_id}' GROUP BY c.id, c.full_name_ln1, c.customer_number LIMIT 1;", note=None, sort_order=2, has_placeholders=True, language_code='english'),
            dict(id=8, prompt_text='මෙම ගනුදෙනුකරු අගයන්න: {customer_id}', prompt="Rate this customer's ability to obtain an another loan but currently the customer has {total_balance} as a loan balance and has {total_due_interest} as past due interest.", prompt_type='user', prompt_query="SELECT c.id, c.full_name_ln1, c.customer_number, COALESCE(SUM(p.balance), 0) AS total_balance, COALESCE(SUM(p.due_interest), 0) AS total_due_interest FROM ci_customer c LEFT JOIN pl_account p ON c.id = p.ci_customer_id WHERE c.customer_number = '{customer_id}' GROUP BY c.id, c.full_name_ln1, c.customer_number LIMIT 1;", note=None, sort_order=2, has_placeholders=True, language_code='sinhala'),
            dict(id=9, prompt_text='இந்த வாடிக்கையாளரை மதிப்பிடுக: {customer_id}', prompt="Rate this customer's ability to obtain an another loan but currently the customer has {total_balance} as a loan balance and has {total_due_interest} as past due interest.", prompt_type='user', prompt_query="SELECT c.id, c.full_name_ln1, c.customer_number, COALESCE(SUM(p.balance), 0) AS total_balance, COALESCE(SUM(p.due_interest), 0) AS total_due_interest FROM ci_customer c LEFT JOIN pl_account p ON c.id = p.ci_customer_id WHERE c.customer_number = '{customer_id}' GROUP BY c.id, c.full_name_ln1, c.customer_number LIMIT 1;", note=None, sort_order=2, has_placeholders=True, language_code='tamil'),
            dict(id=10, prompt_text='I-rate ang customer na ito: {customer_id}', prompt="Rate this customer's ability to obtain an another loan but currently the customer has {total_balance} as a loan balance and has {total_due_interest} as past due interest.", prompt_type='user', prompt_query="SELECT c.id, c.full_name_ln1, c.customer_number, COALESCE(SUM(p.balance), 0) AS total_balance, COALESCE(SUM(p.due_interest), 0) AS total_due_interest FROM ci_customer c LEFT JOIN pl_account p ON c.id = p.ci_customer_id WHERE c.customer_number = '{customer_id}' GROUP BY c.id, c.full_name_ln1, c.customer_number LIMIT 1;", note=None, sort_order=2, has_placeholders=True, language_code='tagalog'),
            dict(id=11, prompt_text='ให้คะแนนลูกค้ารายนี้: {customer_id}', prompt="Rate this customer's ability to obtain an another loan but currently the customer has {total_balance} as a loan balance and has {total_due_interest} as past due interest.", prompt_type='user', prompt_query="SELECT c.id, c.full_name_ln1, c.customer_number, COALESCE(SUM(p.balance), 0) AS total_balance, COALESCE(SUM(p.due_interest), 0) AS total_due_interest FROM ci_customer c LEFT JOIN pl_account p ON c.id = p.ci_customer_id WHERE c.customer_number = '{customer_id}' GROUP BY c.id, c.full_name_ln1, c.customer_number LIMIT 1;", note=None, sort_order=2, has_placeholders=True, language_code='thai'),
            # Past Due Analysis prompts
            dict(id=12, prompt_text='Past Due Analysis', prompt='The total balance is {total_loan_balance}.Here\'s the breakdown of past due amounts by aging buckets:Past Due 1-30 Days: {past_due_1_30_days}Past Due 31-90 Days: {past_due_31_90_days}Past Due 91-180 Days: {past_due_91_180_days}Past Due 181-365 Days: {past_due_181_365_days}Past Due Over 365 Days: {past_due_over_365_days}Please do a past due analysis of the above data.', prompt_type='user', prompt_query='SELECT SUM(past_due_amount) AS total_loan_balance, SUM(CASE WHEN past_due_days BETWEEN 1 AND 30 THEN past_due_amount ELSE 0 END) AS past_due_1_30_days, SUM(CASE WHEN past_due_days BETWEEN 31 AND 90 THEN past_due_amount ELSE 0 END) AS past_due_31_90_days, SUM(CASE WHEN past_due_days BETWEEN 91 AND 180 THEN past_due_amount ELSE 0 END) AS past_due_91_180_days, SUM(CASE WHEN past_due_days BETWEEN 181 AND 365 THEN past_due_amount ELSE 0 END) AS past_due_181_365_days, SUM(CASE WHEN past_due_days > 365 THEN past_due_amount ELSE 0 END) AS past_due_over_365_days FROM pl_account', note=None, sort_order=3, has_placeholders=True, language_code='english'),
            dict(id=13, prompt_text='කල්පසු විශ්ලේෂණය', prompt='The total balance is {total_loan_balance}.Here\'s the breakdown of past due amounts by aging buckets:Past Due 1-30 Days: {past_due_1_30_days}Past Due 31-90 Days: {past_due_31_90_days}Past Due 91-180 Days: {past_due_91_180_days}Past Due 181-365 Days: {past_due_181_365_days}Past Due Over 365 Days: {past_due_over_365_days}Please do a past due analysis of the above data.', prompt_type='user', prompt_query='SELECT SUM(past_due_amount) AS total_loan_balance, SUM(CASE WHEN past_due_days BETWEEN 1 AND 30 THEN past_due_amount ELSE 0 END) AS past_due_1_30_days, SUM(CASE WHEN past_due_days BETWEEN 31 AND 90 THEN past_due_amount ELSE 0 END) AS past_due_31_90_days, SUM(CASE WHEN past_due_days BETWEEN 91 AND 180 THEN past_due_amount ELSE 0 END) AS past_due_91_180_days, SUM(CASE WHEN past_due_days BETWEEN 181 AND 365 THEN past_due_amount ELSE 0 END) AS past_due_181_365_days, SUM(CASE WHEN past_due_days > 365 THEN past_due_amount ELSE 0 END) AS past_due_over_365_days FROM pl_account', note=None, sort_order=3, has_placeholders=True, language_code='sinhala'),
            dict(id=14, prompt_text='தாமத பகுப்பாய்வு', prompt='The total balance is {total_loan_balance}.Here\'s the breakdown of past due amounts by aging buckets:Past Due 1-30 Days: {past_due_1_30_days}Past Due 31-90 Days: {past_due_31_90_days}Past Due 91-180 Days: {past_due_91_180_days}Past Due 181-365 Days: {past_due_181_365_days}Past Due Over 365 Days: {past_due_over_365_days}Please do a past due analysis of the above data.', prompt_type='user', prompt_query='SELECT SUM(past_due_amount) AS total_loan_balance, SUM(CASE WHEN past_due_days BETWEEN 1 AND 30 THEN past_due_amount ELSE 0 END) AS past_due_1_30_days, SUM(CASE WHEN past_due_days BETWEEN 31 AND 90 THEN past_due_amount ELSE 0 END) AS past_due_31_90_days, SUM(CASE WHEN past_due_days BETWEEN 91 AND 180 THEN past_due_amount ELSE 0 END) AS past_due_91_180_days, SUM(CASE WHEN past_due_days BETWEEN 181 AND 365 THEN past_due_amount ELSE 0 END) AS past_due_181_365_days, SUM(CASE WHEN past_due_days > 365 THEN past_due_amount ELSE 0 END) AS past_due_over_365_days FROM pl_account', note=None, sort_order=3, has_placeholders=True, language_code='tamil'),
            dict(id=15, prompt_text='Pagsusuri ng Nakaraang Utang', prompt='The total balance is {total_loan_balance}.Here\'s the breakdown of past due amounts by aging buckets:Past Due 1-30 Days: {past_due_1_30_days}Past Due 31-90 Days: {past_due_31_90_days}Past Due 91-180 Days: {past_due_91_180_days}Past Due 181-365 Days: {past_due_181_365_days}Past Due Over 365 Days: {past_due_over_365_days}Please do a past due analysis of the above data.', prompt_type='user', prompt_query='SELECT SUM(past_due_amount) AS total_loan_balance, SUM(CASE WHEN past_due_days BETWEEN 1 AND 30 THEN past_due_amount ELSE 0 END) AS past_due_1_30_days, SUM(CASE WHEN past_due_days BETWEEN 31 AND 90 THEN past_due_amount ELSE 0 END) AS past_due_31_90_days, SUM(CASE WHEN past_due_days BETWEEN 91 AND 180 THEN past_due_amount ELSE 0 END) AS past_due_91_180_days, SUM(CASE WHEN past_due_days BETWEEN 181 AND 365 THEN past_due_amount ELSE 0 END) AS past_due_181_365_days, SUM(CASE WHEN past_due_days > 365 THEN past_due_amount ELSE 0 END) AS past_due_over_365_days FROM pl_account', note=None, sort_order=3, has_placeholders=True, language_code='tagalog'),
            dict(id=16, prompt_text='การวิเคราะห์หนี้ค้างชำระ', prompt='The total balance is {total_loan_balance}.Here\'s the breakdown of past due amounts by aging buckets:Past Due 1-30 Days: {past_due_1_30_days}Past Due 31-90 Days: {past_due_31_90_days}Past Due 91-180 Days: {past_due_91_180_days}Past Due 181-365 Days: {past_due_181_365_days}Past Due Over 365 Days: {past_due_over_365_days}Please do a past due analysis of the above data.', prompt_type='user', prompt_query='SELECT SUM(past_due_amount) AS total_loan_balance, SUM(CASE WHEN past_due_days BETWEEN 1 AND 30 THEN past_due_amount ELSE 0 END) AS past_due_1_30_days, SUM(CASE WHEN past_due_days BETWEEN 31 AND 90 THEN past_due_amount ELSE 0 END) AS past_due_31_90_days, SUM(CASE WHEN past_due_days BETWEEN 91 AND 180 THEN past_due_amount ELSE 0 END) AS past_due_91_180_days, SUM(CASE WHEN past_due_days BETWEEN 181 AND 365 THEN past_due_amount ELSE 0 END) AS past_due_181_365_days, SUM(CASE WHEN past_due_days > 365 THEN past_due_amount ELSE 0 END) AS past_due_over_365_days FROM pl_account', note=None, sort_order=3, has_placeholders=True, language_code='thai'),
            # Age Group Analysis prompts
            dict(id=17, prompt_text='Age Group Analysis', prompt='Analyze this age group distribution of our customer base. Age 10-18: {age_10_18} customers, Age 19-35: {age_19_35} customers, Age 36-55: {age_36_55} customers, Age 56-65: {age_56_65} customers, Age >65: {age_over_65} customers. Total customers analyzed: {total_customers}. Please analyze this data according to the best ratio and give suggestions.', prompt_type='user', prompt_query='SELECT SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 10 AND 18 THEN 1 ELSE 0 END) AS age_10_18, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 19 AND 35 THEN 1 ELSE 0 END) AS age_19_35, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 36 AND 55 THEN 1 ELSE 0 END) AS age_36_55, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 56 AND 65 THEN 1 ELSE 0 END) AS age_56_65, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) > 65 THEN 1 ELSE 0 END) AS age_over_65, COUNT(*) AS total_customers FROM ci_customer WHERE date_of_birth IS NOT NULL AND TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) >= 10;', note=None, sort_order=4, has_placeholders=True, language_code='english'),
            dict(id=18, prompt_text='වයස් කාණ්ඩ විශ්ලේෂණය', prompt='Analyze this age group distribution of our customer base. Age 10-18: {age_10_18} customers, Age 19-35: {age_19_35} customers, Age 36-55: {age_36_55} customers, Age 56-65: {age_56_65} customers, Age >65: {age_over_65} customers. Total customers analyzed: {total_customers}. Please analyze this data according to the best ratio and give suggestions.', prompt_type='user', prompt_query='SELECT SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 10 AND 18 THEN 1 ELSE 0 END) AS age_10_18, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 19 AND 35 THEN 1 ELSE 0 END) AS age_19_35, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 36 AND 55 THEN 1 ELSE 0 END) AS age_36_55, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 56 AND 65 THEN 1 ELSE 0 END) AS age_56_65, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) > 65 THEN 1 ELSE 0 END) AS age_over_65, COUNT(*) AS total_customers FROM ci_customer WHERE date_of_birth IS NOT NULL AND TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) >= 10;', note=None, sort_order=4, has_placeholders=True, language_code='sinhala'),
            dict(id=19, prompt_text='வயதுக் குழு பகுப்பாய்வு', prompt='Analyze this age group distribution of our customer base. Age 10-18: {age_10_18} customers, Age 19-35: {age_19_35} customers, Age 36-55: {age_36_55} customers, Age 56-65: {age_56_65} customers, Age >65: {age_over_65} customers. Total customers analyzed: {total_customers}. Please analyze this data according to the best ratio and give suggestions.', prompt_type='user', prompt_query='SELECT SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 10 AND 18 THEN 1 ELSE 0 END) AS age_10_18, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 19 AND 35 THEN 1 ELSE 0 END) AS age_19_35, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 36 AND 55 THEN 1 ELSE 0 END) AS age_36_55, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 56 AND 65 THEN 1 ELSE 0 END) AS age_56_65, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) > 65 THEN 1 ELSE 0 END) AS age_over_65, COUNT(*) AS total_customers FROM ci_customer WHERE date_of_birth IS NOT NULL AND TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) >= 10;', note=None, sort_order=4, has_placeholders=True, language_code='tamil'),
            dict(id=20, prompt_text='Pagsusuri ng Grupo ng Edad', prompt='Analyze this age group distribution of our customer base. Age 10-18: {age_10_18} customers, Age 19-35: {age_19_35} customers, Age 36-55: {age_36_55} customers, Age 56-65: {age_56_65} customers, Age >65: {age_over_65} customers. Total customers analyzed: {total_customers}. Please analyze this data according to the best ratio and give suggestions.', prompt_type='user', prompt_query='SELECT SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 10 AND 18 THEN 1 ELSE 0 END) AS age_10_18, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 19 AND 35 THEN 1 ELSE 0 END) AS age_19_35, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 36 AND 55 THEN 1 ELSE 0 END) AS age_36_55, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 56 AND 65 THEN 1 ELSE 0 END) AS age_56_65, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) > 65 THEN 1 ELSE 0 END) AS age_over_65, COUNT(*) AS total_customers FROM ci_customer WHERE date_of_birth IS NOT NULL AND TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) >= 10;', note=None, sort_order=4, has_placeholders=True, language_code='tagalog'),
            dict(id=21, prompt_text='การวิเคราะห์กลุ่มอายุ', prompt='Analyze this age group distribution of our customer base. Age 10-18: {age_10_18} customers, Age 19-35: {age_19_35} customers, Age 36-55: {age_36_55} customers, Age 56-65: {age_56_65} customers, Age >65: {age_over_65} customers. Total customers analyzed: {total_customers}. Please analyze this data according to the best ratio and give suggestions.', prompt_type='user', prompt_query='SELECT SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 10 AND 18 THEN 1 ELSE 0 END) AS age_10_18, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 19 AND 35 THEN 1 ELSE 0 END) AS age_19_35, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 36 AND 55 THEN 1 ELSE 0 END) AS age_36_55, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 56 AND 65 THEN 1 ELSE 0 END) AS age_56_65, SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) > 65 THEN 1 ELSE 0 END) AS age_over_65, COUNT(*) AS total_customers FROM ci_customer WHERE date_of_birth IS NOT NULL AND TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) >= 10;', note=None, sort_order=4, has_placeholders=True, language_code='thai'),
            # Savings Analysis prompts
            dict(id=22, prompt_text='Savings Analysis', prompt='Analyze this savings breakdown of our accounts base. Total Savings: ${total_savings}, Total Fixed Deposits: ${total_fixed_deposits}. Please analyze this data according to the best ratio and give suggestions.', prompt_type='user', prompt_query='SELECT SUM(CASE WHEN pat.pl_operating_type_id = 2 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_fixed_deposits, SUM(CASE WHEN pat.pl_operating_type_id = 1 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_savings FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pa.status = 1;', note=None, sort_order=5, has_placeholders=True, language_code='english'),
            dict(id=23, prompt_text='ඉතිරිකිරීම් විශ්ලේෂණය', prompt='Analyze this savings breakdown of our accounts base. Total Savings: ${total_savings}, Total Fixed Deposits: ${total_fixed_deposits}. Please analyze this data according to the best ratio and give suggestions.', prompt_type='user', prompt_query='SELECT SUM(CASE WHEN pat.pl_operating_type_id = 2 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_fixed_deposits, SUM(CASE WHEN pat.pl_operating_type_id = 1 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_savings FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pa.status = 1;', note=None, sort_order=5, has_placeholders=True, language_code='sinhala'),
            dict(id=24, prompt_text='சேமிப்பு பகுப்பாய்வு', prompt='Analyze this savings breakdown of our accounts base. Total Savings: ${total_savings}, Total Fixed Deposits: ${total_fixed_deposits}. Please analyze this data according to the best ratio and give suggestions.', prompt_type='user', prompt_query='SELECT SUM(CASE WHEN pat.pl_operating_type_id = 2 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_fixed_deposits, SUM(CASE WHEN pat.pl_operating_type_id = 1 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_savings FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pa.status = 1;', note=None, sort_order=5, has_placeholders=True, language_code='tamil'),
            dict(id=25, prompt_text='Pagsusuri ng Pag-iimpok', prompt='Analyze this savings breakdown of our accounts base. Total Savings: ${total_savings}, Total Fixed Deposits: ${total_fixed_deposits}. Please analyze this data according to the best ratio and give suggestions.', prompt_type='user', prompt_query='SELECT SUM(CASE WHEN pat.pl_operating_type_id = 2 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_fixed_deposits, SUM(CASE WHEN pat.pl_operating_type_id = 1 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_savings FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pa.status = 1;', note=None, sort_order=5, has_placeholders=True, language_code='tagalog'),
            dict(id=26, prompt_text='การวิเคราะห์เงินฝาก', prompt='Analyze this savings breakdown of our accounts base. Total Savings: ${total_savings}, Total Fixed Deposits: ${total_fixed_deposits}. Please analyze this data according to the best ratio and give suggestions.', prompt_type='user', prompt_query='SELECT SUM(CASE WHEN pat.pl_operating_type_id = 2 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_fixed_deposits, SUM(CASE WHEN pat.pl_operating_type_id = 1 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_savings FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pa.status = 1;', note=None, sort_order=5, has_placeholders=True, language_code='thai'),
        ]
        for prm in prompt_seed:
            exists = session.get(ItPromptMaster, prm['id'])
            if not exists:
                session.add(ItPromptMaster(
                    id=prm['id'], prompt_text=prm['prompt_text'], prompt=prm['prompt'], prompt_type=prm['prompt_type'], prompt_query=prm['prompt_query'], note=prm['note'], is_active=True, sort_order=prm['sort_order'], has_placeholders=prm['has_placeholders'], created_at=now, updated_at=now, language_code=prm['language_code']
                ))

        session.commit()
        print("Seed data inserted.")

def main():
    create_tables()
    alter_user_master_table()
    insert_seed_data()
    
    # Prompt user for admin setup
    try:
        admin_id = input("Enter user ID to set as admin (or press Enter to skip): ").strip()
        if admin_id:
            setup_admin_user(int(admin_id))
    except (ValueError, KeyboardInterrupt):
        print("Skipping admin user setup.")
    
    print("Database setup complete.")

if __name__ == "__main__":
    main()
