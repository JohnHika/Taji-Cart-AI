@echo off
REM Batch file to run the scheduled training script for TajiCart-AI recommendation system

echo Running scheduled training for TajiCart-AI recommendation system...
echo Started at: %date% %time%

REM Change to the recommendation directory
cd /d %~dp0

REM Activate virtual environment if it exists
if exist rec-env\Scripts\activate.bat (
    call rec-env\Scripts\activate.bat
) else (
    echo Virtual environment not found, using system Python
)

REM Run the training script
python schedule_training.py --days 90 --min-interactions 3

REM Check the exit code
if %errorlevel% equ 0 (
    echo Training completed successfully!
) else (
    echo Training failed with error code %errorlevel%
)

echo Finished at: %date% %time%

REM Deactivate virtual environment if it was activated
if exist rec-env\Scripts\activate.bat (
    call deactivate
)

REM Pause if run manually
if not defined SCHEDULED_RUN pause