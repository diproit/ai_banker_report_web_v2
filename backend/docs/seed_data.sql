-- Seed data for ai_banker_report_web tables

-- it_language

INSERT INTO it_language (id, language, display_name, created_at, updated_at, is_active) VALUES
  (1, 'english', 'English', NOW(), NOW(), TRUE),
  (2, 'sinhala', 'සිංහල', NOW(), NOW(), TRUE),
  (3, 'tamil', 'தமிழ்', NOW(), NOW(), TRUE),
  (4, 'tagalog', 'Tagalog', NOW(), NOW(), TRUE),
  (5, 'thai', 'ไทย', NOW(), NOW(), TRUE);


-- it_nav_menu (example root menus)

INSERT INTO it_nav_menu (id, title, title_si, title_ta, title_tl, title_th, url, parent_id, level, path, group_name, sort_order, is_active, it_report_structures_id, created_at, updated_at, has_children) VALUES
  (1, 'Dashboard', 'උපකරණ පුවරුව', 'கட்டுப்பாட்டு பலகை', 'Dashboard', 'แดชบอร์ด', '/dashboard', NULL, 0, '/1/', NULL, 0, 1, NULL, NOW(), NOW(), 0),
  (2, 'AI Analytics', 'AI විශ්ලේෂණ', 'AI பகுப்பாய்வு', 'AI Analytics', 'การวิเคราะห์ AI', '/ai-analytics', NULL, 0, '/2/', NULL, 1, 1, NULL, NOW(), NOW(), 0),
  (3, 'User Rights', 'පරිශීලක අයිතිවාසිකම්', 'பயனர் உரிமைகள்', 'Mga Karapatan ng User', 'สิทธิ์ผู้ใช้', '/user-rights', NULL, 0, '/3/', NULL, 2, 1, NULL, NOW(), NOW(), 0);


-- it_prompt_master (example prompt)

INSERT INTO it_prompt_master (id, prompt_text, prompt, prompt_type, prompt_query, note, is_active, sort_order, has_placeholders, created_at, updated_at, language_code) VALUES
  (1, NULL, 'You are an expert in micro finance and cooperative credit unions. You have a deep understanding of the micro finance institutions and cooperative credit unions, like "Co-operative banks" etc. Your task is to answer various decision making questions by management. IMPORTANT LANGUAGE INSTRUCTION: Always respond in the {language} language.', 'system', NULL, NULL, 1, 0, 1, NOW(), NOW(), 'english'),

  (2, 'Loan past due', 'Analyze this loan past due situation. Total loan balance = {total_loan_balance}, Number of loan accounts = {total_loan_accounts}, Total past due amount = {total_loan_past_due_balance}, Past due account count = {total_past_due_loan_accounts}.', 'user',
    'SELECT COALESCE(SUM(pa.balance),0) AS total_loan_balance, COALESCE(SUM(pa.past_due_amount),0) AS total_loan_past_due_balance, COALESCE(COUNT(pa.id),0) AS total_loan_accounts, COALESCE(COUNT(CASE WHEN pa.past_due_amount > 0 THEN pa.id END),0) AS total_past_due_loan_accounts FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pat.pl_account_category_id = 2 AND pa.status = 1;',
    NULL, 1, 1, 1, NOW(), NOW(), 'english'),

  (3, 'ණය කල්පසු', 'Analyze this loan past due situation. Total loan balance = {total_loan_balance}, Number of loan accounts = {total_loan_accounts}, Total past due amount = {total_loan_past_due_balance}, Past due account count = {total_past_due_loan_accounts}.', 'user',
    'SELECT COALESCE(SUM(pa.balance),0) AS total_loan_balance, COALESCE(SUM(pa.past_due_amount),0) AS total_loan_past_due_balance, COALESCE(COUNT(pa.id),0) AS total_loan_accounts, COALESCE(COUNT(CASE WHEN pa.past_due_amount > 0 THEN pa.id END),0) AS total_past_due_loan_accounts FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pat.pl_account_category_id = 2 AND pa.status = 1;',
    NULL, 1, 1, 1, NOW(), NOW(), 'sinhala'),

  (4, 'கடன் தாமதம்', 'Analyze this loan past due situation. Total loan balance = {total_loan_balance}, Number of loan accounts = {total_loan_accounts}, Total past due amount = {total_loan_past_due_balance}, Past due account count = {total_past_due_loan_accounts}.', 'user',
    'SELECT COALESCE(SUM(pa.balance),0) AS total_loan_balance, COALESCE(SUM(pa.past_due_amount),0) AS total_loan_past_due_balance, COALESCE(COUNT(pa.id),0) AS total_loan_accounts, COALESCE(COUNT(CASE WHEN pa.past_due_amount > 0 THEN pa.id END),0) AS total_past_due_loan_accounts FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pat.pl_account_category_id = 2 AND pa.status = 1;',
    NULL, 1, 1, 1, NOW(), NOW(), 'tamil'),

  (5, 'Nakaraang utang', 'Analyze this loan past due situation. Total loan balance = {total_loan_balance}, Number of loan accounts = {total_loan_accounts}, Total past due amount = {total_loan_past_due_balance}, Past due account count = {total_past_due_loan_accounts}.', 'user',
    'SELECT COALESCE(SUM(pa.balance),0) AS total_loan_balance, COALESCE(SUM(pa.past_due_amount),0) AS total_loan_past_due_balance, COALESCE(COUNT(pa.id),0) AS total_loan_accounts, COALESCE(COUNT(CASE WHEN pa.past_due_amount > 0 THEN pa.id END),0) AS total_past_due_loan_accounts FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pat.pl_account_category_id = 2 AND pa.status = 1;',
    NULL, 1, 1, 1, NOW(), NOW(), 'tagalog'),

  (6, 'เงินกู้ค้างชำระ', 'Analyze this loan past due situation. Total loan balance = {total_loan_balance}, Number of loan accounts = {total_loan_accounts}, Total past due amount = {total_loan_past_due_balance}, Past due account count = {total_past_due_loan_accounts}.', 'user',
    'SELECT COALESCE(SUM(pa.balance),0) AS total_loan_balance, COALESCE(SUM(pa.past_due_amount),0) AS total_loan_past_due_balance, COALESCE(COUNT(pa.id),0) AS total_loan_accounts, COALESCE(COUNT(CASE WHEN pa.past_due_amount > 0 THEN pa.id END),0) AS total_past_due_loan_accounts FROM pl_account pa JOIN pl_account_type pat ON pa.pl_account_type_id = pat.id WHERE pat.pl_account_category_id = 2 AND pa.status = 1;',
    NULL, 1, 1, 1, NOW(), NOW(), 'thai'),

  (7, 'Rate this customer: {customer_id}', 'Rate this customer''s ability to obtain an another loan but currently the customer has {total_balance} as a loan balance and has {total_due_interest} as past due interest.', 'user',
    'SELECT c.id, c.full_name_ln1, c.customer_number, COALESCE(SUM(p.balance), 0) AS total_balance, COALESCE(SUM(p.due_interest), 0) AS total_due_interest FROM ci_customer c LEFT JOIN pl_account p ON c.id = p.ci_customer_id WHERE c.customer_number = ''{customer_id}'' GROUP BY c.id, c.full_name_ln1, c.customer_number LIMIT 1;',
    NULL, 1, 2, 1, NOW(), NOW(), 'english'),

  (8, 'මෙම ගනුදෙනුකරු අගයන්න: {customer_id}', 'Rate this customer''s ability to obtain an another loan but currently the customer has {total_balance} as a loan balance and has {total_due_interest} as past due interest.', 'user',
    'SELECT c.id, c.full_name_ln1, c.customer_number, COALESCE(SUM(p.balance), 0) AS total_balance, COALESCE(SUM(p.due_interest), 0) AS total_due_interest FROM ci_customer c LEFT JOIN pl_account p ON c.id = p.ci_customer_id WHERE c.customer_number = ''{customer_id}'' GROUP BY c.id, c.full_name_ln1, c.customer_number LIMIT 1;',
    NULL, 1, 2, 1, NOW(), NOW(), 'sinhala'),

  (9, 'இந்த வாடிக்கையாளரை மதிப்பிடுக: {customer_id}', 'Rate this customer''s ability to obtain an another loan but currently the customer has {total_balance} as a loan balance and has {total_due_interest} as past due interest.', 'user',
    'SELECT c.id, c.full_name_ln1, c.customer_number, COALESCE(SUM(p.balance), 0) AS total_balance, COALESCE(SUM(p.due_interest), 0) AS total_due_interest FROM ci_customer c LEFT JOIN pl_account p ON c.id = p.ci_customer_id WHERE c.customer_number = ''{customer_id}'' GROUP BY c.id, c.full_name_ln1, c.customer_number LIMIT 1;',
    NULL, 1, 2, 1, NOW(), NOW(), 'tamil'),

  (10, 'I-rate ang customer na ito: {customer_id}', 'Rate this customer''s ability to obtain an another loan but currently the customer has {total_balance} as a loan balance and has {total_due_interest} as past due interest.', 'user',
    'SELECT c.id, c.full_name_ln1, c.customer_number, COALESCE(SUM(p.balance), 0) AS total_balance, COALESCE(SUM(p.due_interest), 0) AS total_due_interest FROM ci_customer c LEFT JOIN pl_account p ON c.id = p.ci_customer_id WHERE c.customer_number = ''{customer_id}'' GROUP BY c.id, c.full_name_ln1, c.customer_number LIMIT 1;',
    NULL, 1, 2, 1, NOW(), NOW(), 'tagalog'),

  (11, 'ให้คะแนนลูกค้ารายนี้: {customer_id}', 'Rate this customer''s ability to obtain an another loan but currently the customer has {total_balance} as a loan balance and has {total_due_interest} as past due interest.', 'user',
    'SELECT c.id, c.full_name_ln1, c.customer_number, COALESCE(SUM(p.balance), 0) AS total_balance, COALESCE(SUM(p.due_interest), 0) AS total_due_interest FROM ci_customer c LEFT JOIN pl_account p ON c.id = p.ci_customer_id WHERE c.customer_number = ''{customer_id}'' GROUP BY c.id, c.full_name_ln1, c.customer_number LIMIT 1;',
    NULL, 1, 2, 1, NOW(), NOW(), 'thai');

-- Add more INSERT statements for other tables as needed.