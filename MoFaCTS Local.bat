set PATH=%PATH%;C:\Program Files (x86)\Git\bin
cd C:\Users\ppavlik\Documents\NetBeansProjects\mofacts
vagrant up
vagrant ssh -c 'cd mofacts/mofacts; ./run_meteor'
PAUSE