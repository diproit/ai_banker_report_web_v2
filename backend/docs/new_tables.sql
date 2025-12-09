-- Table: it_language
CREATE TABLE it_language (
	id INT AUTO_INCREMENT PRIMARY KEY,
	language VARCHAR(10) NOT NULL UNIQUE,
	display_name VARCHAR(50) NOT NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Table: it_nav_menu
CREATE TABLE it_nav_menu (
	id INT AUTO_INCREMENT PRIMARY KEY,
	title VARCHAR(255) NOT NULL,
	title_si VARCHAR(255),
	title_ta VARCHAR(255),
	title_tl VARCHAR(255),
	title_th VARCHAR(255),
	url VARCHAR(255) NOT NULL,
	parent_id INT,
	level INT NOT NULL DEFAULT 0,
	path VARCHAR(255) NOT NULL,
	group_name VARCHAR(255),
	sort_order INT NOT NULL DEFAULT 0,
	it_report_structures_id INT,
	has_children BOOLEAN NOT NULL DEFAULT FALSE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	FOREIGN KEY (it_report_structures_id) REFERENCES it_report_structures(id)
);

-- Table: it_prompt_master
CREATE TABLE it_prompt_master (
	id INT AUTO_INCREMENT PRIMARY KEY,
	prompt_text VARCHAR(1000) NULL,
	prompt VARCHAR(1000) NOT NULL,
	prompt_type VARCHAR(50) NOT NULL,
	prompt_query VARCHAR(500) NULL,
	note VARCHAR(500) NULL,
	language_code VARCHAR(10) NOT NULL,
	sort_order INT DEFAULT 0,
	has_placeholders BOOLEAN NOT NULL DEFAULT FALSE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	FOREIGN KEY (language_code) REFERENCES it_language(language)
);

-- Table: it_report_structures
CREATE TABLE it_report_structures (
	id INT AUTO_INCREMENT PRIMARY KEY,
	description VARCHAR(500),
	base_query TEXT,
	json_form TEXT,
	json_schema TEXT,
	placeholder_data TEXT,
	jrxml_json TEXT,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Table: it_user_nav_rights
CREATE TABLE it_user_nav_rights (
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	nav_menu_id INT NOT NULL,
	can_view BOOLEAN NOT NULL DEFAULT TRUE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	UNIQUE KEY unique_user_nav_right (user_id, nav_menu_id),
	FOREIGN KEY (nav_menu_id) REFERENCES it_nav_menu(id),
	FOREIGN KEY (user_id) REFERENCES it_user_master(id)
);

-- Table: it_report_config
CREATE TABLE it_report_config (
	id INT AUTO_INCREMENT PRIMARY KEY,
	it_user_master_id INT,
	branch_id INT,
	it_report_structure_id INT,
	report_cfg_json TEXT NOT NULL,
	report_cfg_name VARCHAR(255) NOT NULL,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (it_user_master_id) REFERENCES it_user_master(id),
	FOREIGN KEY (branch_id) REFERENCES gl_branch(id),
	FOREIGN KEY (it_report_structure_id) REFERENCES it_report_structures(id)
);

-- Table: it_report_design
CREATE TABLE it_report_design (
	id INT AUTO_INCREMENT PRIMARY KEY,
	it_user_master_id INT,
	branch_id INT,
	it_report_structure_id INT,
	report_design_json TEXT NOT NULL,
	report_design_name VARCHAR(255) NOT NULL,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (it_user_master_id) REFERENCES it_user_master(id),
	FOREIGN KEY (branch_id) REFERENCES gl_branch(id),
	FOREIGN KEY (it_report_structure_id) REFERENCES it_report_structures(id)
);
