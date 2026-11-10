@echo off
title Twilight
cd /d "%~dp0"
rem A new helper cannot overwrite itself while it is running, so it waits
rem here as .new and is moved into place the next time you start.
if exist "%~dp0TwilightHelper.ps1.new" move /y "%~dp0TwilightHelper.ps1.new" "%~dp0TwilightHelper.ps1" >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0TwilightHelper.ps1"
if errorlevel 1 pause
