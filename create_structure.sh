#!/bin/bash

# Create base directories
mkdir -p "college-name-here/01. Computer Engineering/1st Sem/PPS (ESC-103)"

# Add syllabus file in the right place
touch "college-name-here/01. Computer Engineering/CE_Syllabus.pdf"

# Navigate to the subject folder for PYQs
cd "college-name-here/01. Computer Engineering/1st Sem/PPS (ESC-103)"

# Create 16 placeholder PYQs from 2015 to 2022
for year in {2015..2022}; do
    touch "PPS (May $year) (ESC-103).pdf"
    touch "PPS (Dec $year) (ESC-103).pdf"
done
