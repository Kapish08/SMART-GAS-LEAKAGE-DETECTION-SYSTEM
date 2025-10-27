#include <WiFiNINA.h>
#include <PubSubClient.h>
#include "DHT.h"

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

const char* ssid = "AEBA";
const char* password = "kapish111";
const char* mqtt_server = "192.168.137.112";   // Replace with your Pi?s IP

WiFiClient wifiClient;
PubSubClient client(wifiClient);

int gasPin = A0;
int flamePin = 2;

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT broker...");
    if (client.connect("Nano33IoTClient")) {
      Serial.println(" connected!");
    } else {
      Serial.print(" failed, rc=");
      Serial.println(client.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(9600);
  while (!Serial);
  dht.begin();
  pinMode(flamePin, INPUT);
  pinMode(gasPin, INPUT);

  Serial.println("Connecting WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP: "); Serial.println(WiFi.localIP());

  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) reconnect();

  int gasValue = analogRead(gasPin);
  int flameValue = digitalRead(flamePin);
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  // JSON-like payload
  char payload[128];
  sprintf(payload, "{\"gas\":%d,\"flame\":%d,\"temp\":%.2f,\"hum\":%.2f}",
          gasValue, flameValue, temp, hum);

  client.publish("iot/gas_readings", payload);
  Serial.println(payload);

  delay(2000);
}
