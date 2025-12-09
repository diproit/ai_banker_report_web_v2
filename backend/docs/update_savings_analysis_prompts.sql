-- Update prompt_query and prompt for Savings Analysis records (IDs 22-26)

UPDATE it_prompt_master 
SET prompt_query = 'SELECT
    SUM(CASE WHEN pat.pl_operating_type_id = 2 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_fixed_deposits,
    SUM(CASE WHEN pat.pl_operating_type_id = 1 AND pat.pl_account_category_id = 1 THEN pa.balance ELSE 0 END) AS total_savings
    -- If Shares have a specific pl_operating_type_id and pl_account_category_id, replace the placeholders below
FROM
    pl_account pa
JOIN
    pl_account_type pat ON pa.pl_account_type_id = pat.id
WHERE
    pa.status = 1;',
    prompt = 'Analyze this savings breakdown of our accounts base. Total Savings: ${total_savings}, Total Fixed Deposits: ${total_fixed_deposits}. Please analyze this data according to the best ratio and give suggestions.',
    updated_at = NOW()
WHERE id IN (22, 23, 24, 25, 26);