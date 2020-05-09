import os

counter = 0
for _, _, files in os.walk("cartes"):
	for file in files:
		if os.path.exists("cartes/"+str(counter)+".png"):
			counter+=1
			continue
		os.rename("cartes/"+file, "cartes/"+str(counter)+"."+file.split(".")[1])
		counter += 1
