void setup() {
  Serial.begin(9600); // Ajuste a taxa de baud para corresponder à configuração da porta serial no Raspberry Pi
}

void loop() {
  // Leia seus dados analógicos aqui
  int tensao = analogRead(A0);
  int corrente = analogRead(A1);

  // Envie os dados pela porta serial
  Serial.print("T");
  Serial.println(tensao);
  Serial.print("C");
  Serial.println(corrente);

  delay(1000); // Ajuste o intervalo conforme necessário
}
