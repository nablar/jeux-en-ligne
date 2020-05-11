import os
import re

pattern = re.compile("\d+\.jpg")
counter = 0
for _, _, files in os.walk("cartes"):
	for file in files:
		if pattern.match(file): # Card already has correct name
			continue
		while os.path.exists("cartes/"+str(counter)+".jpg"): # Name is already taken : increment until not taken
			counter+=1
		os.rename("cartes/"+file, "cartes/"+str(counter)+"."+file.split(".")[1]) # Rename the card
		counter += 1
