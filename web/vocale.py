import speech_recognition as sr  
import pyttsx3

def dire(text):
    """Prononce le texte dans les hauts parleurs."""
    engine = pyttsx3.init()
    voices = engine.getProperty('voices')
    engine.setProperty('voice', voices[0].id)
    engine.say(text)
    engine.runAndWait()
    print(voices[0].id)

reconizer  = sr.Recognizer()

def reconnaitre():
    """Retourne le texte reconnu en Fr dans le micro en texte"""
    with sr.Microphone() as source:
        audio = reconizer.listen(source)
        text = reconizer.recognize_google(audio,  language='fr-FR')
        return text

if __name__ == "__main__":
    text = ""
    while text != "stop":
        print("""Dites quelque chose (dire "stop" pour arrêter):""")
        try:
            text = reconnaitre()
            print("Vous avez dit : " + text)
            dire(text)
        except sr.UnknownValueError:
            print("L'audio n'as pas été compris")
        except sr.RequestError as e:
            print("Le service Google Speech API ne fonctionne plus" + format(e))


