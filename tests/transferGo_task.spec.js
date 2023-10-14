const {test, expect} = require('@playwright/test');
const apiUrl = "https://my.transfergo.com/api/booking/quotes"

test('Checking delivery options', async ( {request}) => {
  const response = await request.get(`${apiUrl}?fromCurrencyCode=GBP&toCurrencyCode=EUR&fromCountryCode=GB&toCountryCode=FR&amount=1000&calculationBase=sendAmount`);
  expect(response.status()).toBe(200);

  const responseBody = JSON.parse(await response.text());
  const deliveryOptions = responseBody.options;

  expect((deliveryOptions.some(opt => opt.code === "now") && deliveryOptions.some(opt => opt.code === "standard")) || 
  (deliveryOptions.some(opt => opt.code === "standard") && deliveryOptions.some(opt => opt.code === "today"))) // tikriname, ar egzistuoja tinkami delivery optionai
  
});

test('Checking payment options', async ({request}) => {
  const response = await request.get(`${apiUrl}?fromCurrencyCode=GBP&toCurrencyCode=EUR&fromCountryCode=GB&toCountryCode=FR&amount=1000&calculationBase=sendAmount`);
  expect(response.status()).toBe(200);

  const responseBody = JSON.parse(await response.text());
  const deliveryOptions = responseBody.options;

  for (const option of deliveryOptions) {
    const paymentOptions = option.payInOptions;
    const sendingAmount = parseFloat(option.sendingAmount.value);
    const fee = parseFloat(option.fee.value);
    const currencyExchangeRate = parseFloat(option.rate.value);
    const correctReceivingAmount = currencyExchangeRate * (sendingAmount - fee);
    const receivingAmount = parseFloat(option.receivingAmount.value);

    expect(receivingAmount).toBe(correctReceivingAmount); //tikriname ar receiving amount yra toks, koks turetu buti apskaiciuojant
    expect(paymentOptions.some(opt => opt.code === "card") && 
    paymentOptions.some(opt => opt.code === "bank")).toBe(true); // tikriname, ar visi deliveryOptionai turi korteles ir banko atsiskaitymus
  };

});

test('Verify delivery options have maxAmount', async ({request}) => {
  const response = await request.get(`${apiUrl}?fromCurrencyCode=GBP&toCurrencyCode=EUR&fromCountryCode=GB&toCountryCode=FR&amount=3000&calculationBase=sendAmount`);
  expect(response.status()).toBe(200);

  const responseBody = JSON.parse(await response.text());
  const deliveryOptions = responseBody.options;

  for (const option of deliveryOptions) {
    const maxAmount = option.configuration.maxAmount;
    const sendingAmount = parseFloat(option.sendingAmount.value);
    const maxAmountValue = parseFloat(option.configuration.maxAmount.value)
    const availability = option.availability.isAvailable;

    expect(Object.keys(maxAmount).length).toBeGreaterThan(0); // parodo, jog konfiguracija nera tuscia
    if(sendingAmount > maxAmountValue){
      expect(availability).toBe(false); // jei siunciame daugiau, nei leistinas maxAmount, tikimes gauti false availability
    }
  };
});

test('Verify that users are unable to send less that 1EUR and more than 1000000EUR', async ({request}) => {
  const lessThanEuroResponse = await request.get(`${apiUrl}?fromCurrencyCode=GBP&toCurrencyCode=EUR&fromCountryCode=GB&toCountryCode=FR&amount=0.1&calculationBase=sendAmount`);
  const moreThanMillionEuroResponse = await request.get(`${apiUrl}?fromCurrencyCode=GBP&toCurrencyCode=EUR&fromCountryCode=GB&toCountryCode=FR&amount=1000001&calculationBase=sendAmount`);

  const lessThanEuroResponseBody = JSON.parse(await lessThanEuroResponse.text());
  const moreThanMillionEuroResponseBody = JSON.parse(await moreThanMillionEuroResponse.text())

  expect(lessThanEuroResponseBody.error).toBe("AMOUNT_IS_TOO_SMALL"); //tikriname, ar randama error zinute, kai bandome siusti maziau nei eura
  expect(moreThanMillionEuroResponseBody.error).toBe("AMOUNT_IS_TOO_LARGE"); //tikriname, ar randama error zinute, kai bandome siusti daugiau nei milijona
  expect(lessThanEuroResponseBody.options).toBeUndefined; //tikriname, jog options elemento nera JSON body, kai bandome siusti maziau nei eura
  expect(moreThanMillionEuroResponseBody.options).toBeUndefined; //tikriname, jog options elemento nera JSON body, kai bandome siusti daugiau nei milijona

});

test('Verify endpoint response time under 200ms', async ({request}) => {
  const start = Date.now();
  await request.get(`${apiUrl}?fromCurrencyCode=GBP&toCurrencyCode=EUR&fromCountryCode=GB&toCountryCode=FR&amount=3000&calculationBase=sendAmount`)
  const endTime = Date.now();
  const elapsedTime = endTime - start; //apskaiciuojame kiek laiko uztruko nuo requesto pradzios iki pabaigos
  expect(elapsedTime).toBeLessThan(200); // tikriname, ar requesto laikas mazesnis nei 200
})