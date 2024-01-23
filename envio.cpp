#include <Wire.h>

#define FILTRO 0.03 // TAXA DE VARIAÇÃO
float tensaoAnterior = 0.0;
float correnteAnterior = 0.0;

float correnteMapeada = 0.0;
float tensaoMapeada = 0.0;

void setup() {
  Wire.begin();
  delay(1000); // Aguarde a inicialização do I2C
}

void loop() {
  float tensao = analogRead(A1);
  float corrente = analogRead(A0);

  tensaoMapeada = tensao * 0.0977517106549365;
  correnteMapeada = corrente * 0.5865102639296188;

  if (tensaoMapeada <= 100) {
    if (tensaoAnterior + (100 * FILTRO) < tensaoMapeada || tensaoAnterior - (100 * FILTRO) > tensaoMapeada) {
      tensaoAnterior = tensaoMapeada;
    }
  } else {
    tensaoAnterior = 100;
  }

  if (tensaoMapeada <= 0) {
    tensaoAnterior = 0;
  }

  if (correnteMapeada <= 600) {
    if (correnteAnterior + (600 * FILTRO) < correnteMapeada || correnteAnterior - (600 * FILTRO) > correnteMapeada) {
      correnteAnterior = correnteMapeada;
    }
  } else {
    correnteAnterior = 600;
  }

  if (correnteMapeada <= 0) {
    correnteAnterior = 0;
  }

  // Envia os dados via I2C
  Wire.beginTransmission(8); // Endereço do dispositivo I2C
  Wire.write('T');
  Wire.write(tensaoAnterior);
  Wire.write('C');
  Wire.write(correnteAnterior);
  Wire.endTransmission();

  delay(200);
}
