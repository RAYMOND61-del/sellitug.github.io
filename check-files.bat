@echo off
echo ========================================
echo   Checking Files for GitHub Upload
echo ========================================
echo.

echo Checking if all required files exist...
echo.

if exist "index.html" (
    echo [OK] index.html found
) else (
    echo [ERROR] index.html NOT FOUND!
)

if exist "login.html" (
    echo [OK] login.html found
) else (
    echo [ERROR] login.html NOT FOUND!
)

if exist "register.html" (
    echo [OK] register.html found
) else (
    echo [ERROR] register.html NOT FOUND!
)

if exist "products.html" (
    echo [OK] products.html found
) else (
    echo [ERROR] products.html NOT FOUND!
)

if exist "style.css" (
    echo [OK] style.css found
) else (
    echo [ERROR] style.css NOT FOUND!
)

if exist "app.js" (
    echo [OK] app.js found
) else (
    echo [ERROR] app.js NOT FOUND!
)

echo.
echo ========================================
echo   All files are ready to upload!
echo ========================================
echo.
echo Next steps:
echo 1. Go to: https://github.com/raymond61-del/sellitug.github.io
echo 2. Click "Add file" then "Upload files"
echo 3. Drag these 6 files to GitHub
echo 4. Click "Commit changes"
echo 5. Wait 5 minutes
echo 6. Visit your site and press Ctrl+F5
echo.
pause
