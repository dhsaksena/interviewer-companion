#!/bin/bash

echo "MySQL Setup Helper for WSL"
echo "=========================="
echo ""

# Option 1: Reset root password
echo "Option 1: Reset root password"
echo "Run these commands one by one:"
echo ""
echo "Step 1: Stop MySQL"
echo "sudo service mysql stop"
echo ""
echo "Step 2: Start MySQL in safe mode"
echo "sudo mysqld_safe --skip-grant-tables &"
echo ""
echo "Step 3: Connect without password"
echo "mysql -u root"
echo ""
echo "Step 4: Run these SQL commands:"
cat << 'SQL'
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_new_password';
EXIT;
SQL

echo ""
echo "Step 5: Restart MySQL normally"
echo "sudo service mysql restart"
echo ""
echo "Step 6: Update .env with your new password"
echo ""
echo "=========================="
echo ""
echo "Option 2: Create a new user (easier)"
echo "Run this command:"
echo "mysql -u root -e \"CREATE USER 'dev'@'localhost' IDENTIFIED BY 'password'; GRANT ALL PRIVILEGES ON *.* TO 'dev'@'localhost'; FLUSH PRIVILEGES;\""
echo ""
echo "Then update .env:"
echo "DB_USER=dev"
echo "DB_PASSWORD=password"
