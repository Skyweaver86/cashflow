-- Run this in your MySQL/phpMyAdmin to fix the theme column
ALTER TABLE users MODIFY COLUMN theme_preference 
  ENUM('orange','dark','light','starbucks','ocean') DEFAULT 'starbucks';

-- Also update any existing users to use starbucks theme
UPDATE users SET theme_preference = 'starbucks' 
  WHERE theme_preference IN ('orange','light');
