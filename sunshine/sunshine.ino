/*
  Emits a 440 Hz tone when it is dark around the photoresistor.
*/

#include <Timer.h>
#include <DigitalInput.h>
#include <DigitalOutput.h>

const int ledPin = 13;
const int buttonPin = 2;
const int speakerPin = 7;

const int frequency = 440; // Hz
const int lightThreshold = 660; // Light when under threshold

int lightLevel = 0;
int temperature = 0;
int enabled = false;
int oldState = HIGH;

class MovingAverageFilter {
public:
  MovingAverageFilter(int length) : M(length), y(0), n(0) {
    X = new int[M];
    for (int k = 0; k != M; ++k) {
      X[k] = 0;
    }
  };
  ~MovingAverageFilter() {
    delete[] X;
  };
  void update(int xn) {
    int xp = X[n];
    X[n] = xn;
    y += xn/M - xp/M;
    n = (n+1)%M;
  }
  int output() {
    return y;
  };
private:
  int M; // filter length
  int n; // index of oldest value
  int y; // last output value
  int* X; // circular buffer of last M input values
};

Timer timer1(250, &readSensor); // every 250 ms
Timer timer2(60000, &sendToSerial); // every min
MovingAverageFilter filter(16);
DigitalInput button(buttonPin, INPUT_PULLUP); // Turn on input pullup resistor
DigitalOutput led(ledPin);

void readSensor() {
  temperature = analogRead(A0);
  lightLevel = analogRead(A1);
  filter.update(lightLevel);
}

void sendToSerial() {
  Serial.print("{\"light_level_current\":");
  Serial.print(1023-lightLevel);
  Serial.print(",\"light_level_average\":");
  Serial.print(1023-filter.output());
  Serial.print(",\"temperature\":");
  Serial.print(temperature);
  Serial.println("}");
}

void setup() {
  Serial.begin(9600);
  led.attach();
  button.attach();
  timer1.start();
  timer2.start();
}

void loop() {
  timer1.update();
  timer2.update();

  // Turn alarm on or off.
  int newState = button.read();
  if ((oldState == HIGH) && (newState == LOW)) {
    enabled = !enabled;
    enabled ? led.on() : led.off();
    delay(20);
  }
  oldState = newState;

  // Sound the buzzer if it is not dark
  if (enabled && (filter.output() < lightThreshold)) {
    tone(speakerPin, frequency);
  } else {
    noTone(speakerPin);
  }

  delay(1); // for stability
}
