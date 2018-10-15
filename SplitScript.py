import json 
import os, shutil

def deleteFiles(folder):
    for the_file in os.listdir(folder):
        file_path = os.path.join(folder, the_file)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
            #elif os.path.isdir(file_path): shutil.rmtree(file_path)
        except Exception as e:
            print(e)

rulesJsonPath = '/Users/timpalade/src/adblocker/rules.json'
exepJsonPath = '/Users/timpalade/src/adblocker/exceptions.json'
outputPath = '/Users/timpalade/src/newCliqz-iOS/Cliqz/Privacy/Assets/AdBlocker/Chunks/'
print('start')

#load exceptions
exceptionsString = ''
exceptionsCount = 0
with open(exepJsonPath, 'r') as inputfile:
    exep = json.load(inputfile)
    exceptionsCount = len(exep)
    exceptionsString = json.dumps(exep)
#clean exceptions string - remove the first and last paranthesis
exceptionsString = exceptionsString[1:len(exceptionsString)-1]
#print(exceptionsString)

chunkSize = 700 #- exceptionsCount

# delete files in outputPath
deleteFiles(outputPath)

#remember to also create the files you want
with open(rulesJsonPath, 'r') as inputfile:
    rules = json.load(inputfile)
    number_of_rules = len(rules)
    print(number_of_rules)
    number_of_files = number_of_rules / chunkSize
    if number_of_rules % chunkSize > 0:
        number_of_files = number_of_files + 1
    print(number_of_files)
    
    start = 0
    end = chunkSize
    
    for i in range(0, number_of_files):
        fileString = '['
        j = start
        while(j < end):
            rule_str = json.dumps(rules[j])
            fileString += rule_str
            fileString += ','
            j += 1
        
        #add exceptions
        #fileString += exceptionsString
        #remove comma at the end
        fileString = fileString[0:len(fileString)-1]
        fileString += ']'

        fileName = outputPath + 'adblocker_' + str(i) + '.json'
        file = open(fileName, 'w+')
        file.write(fileString)
        file.close()

        start = end
        end += chunkSize

        if end > number_of_rules:
            end = number_of_rules
        
