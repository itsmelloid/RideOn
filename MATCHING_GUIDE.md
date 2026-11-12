# Totoong Rider Matching: paano ito gumagana at paano i-test

## 1. Ang ideya (simple lang)

Dati, **timer sa phone** ang gumagawa ng "rider found". Ngayon, ang **database sa Supabase** na ang nagdedesisyon.
Ang dalawang app (passenger at rider) ay nag-uusap sa isa't isa **sa pamamagitan ng database**.

```
PASSENGER APP                  SUPABASE (database)                 RIDER APP
-------------                  -------------------                 ---------
Confirm Booking  ---------->   request_trip()                     
                               trip = "searching"
                                                  <------------    bawat 4 segundo:
                                                                   open_requests()
                               (ipinapakita ang request)  ----->   lalabas ang request
                                                  <------------    Accept -> accept_trip()
                               "accepted" (unang rider lang)
bawat 3 segundo: poll_trip() <-
"Rider found!"  <------------  (+ lokasyon ng rider)               nagpapadala ng lokasyon
                                                  <------------    Arrived -> rider_arrived()
                                                  <------------    Start   -> start_trip()
"En route..." <---------------                                     
                                                  <------------    Complete -> complete_trip()
"Trip completed" <------------ (final fare, wallet, earnings)
```

Bakit **polling** (nagtatanong bawat ilang segundo) at hindi realtime push?
Mas simple, mas maaasahan, at hindi lumalabas sa ibang riders ang private na detalye (halimbawa ang phone number ng pasahero).
Para sa maliit na bayan, sapat ito. Pwede nating idagdag ang Supabase Realtime sa susunod.

## 2. Ang mga bagong proteksyon (bakit hindi na pwedeng mandaya)

| Dati | Ngayon |
|---|---|
| Ang phone ang nagsasabi ng fare | Ang **server** ang nag-compute ng fare (`calc_fare`) |
| Pwedeng mag-insert ng trip ang rider ng kahit anong halaga | Walang direktang insert/update sa `trips`; mga function lang |
| Dalawang rider ay pwedeng parehong "mag-accept" | Ang **una lang** ang mananalo (`accept_trip`), ang pangalawa ay "no longer available" |
| Maraming sabay-sabay na booking | **Isang** active trip lang bawat pasahero at bawat rider (ipinatutupad ng database) |
| Walang timeout | Kapag walang tumanggap sa loob ng 90 segundo: "No riders available" |
| Cancel ng rider = cancel ng trip | Babalik sa "searching" at hahanap ng ibang rider |
| Wallet at earnings galing sa phone | Ang `complete_trip` ang nagre-record, **isang beses** lang |

## 3. Setup (isang beses)

1. Sa Supabase: **SQL Editor -> New query**, i-paste ang **`supabase/matching.sql`**, i-**Run**.
   (Dapat tapos mo na ang `schema.sql`. Ligtas i-run ulit.)
2. Palitan ang mga file sa app ng mga nasa zip na ito, tapos:
   ```
   npx expo start -c
   ```
3. Walang bagong package na kailangang i-install.

## 4. Paano i-test (kailangan ng 2 device)

Kailangan mo ng **dalawang phone** (o isang phone at isang emulator), parehong naka-Expo Go o APK.

**Phone A, ang Passenger**
- Login: `09123456789` / `password123`.

**Phone B, ang Rider**
1. Login: `09123456780` / `password123` (approved na ang account na ito).
2. Sa Dashboard, i-**ON** ang switch na "YOU ARE ONLINE". **Payagan ang Location** kapag tinanong.
   (Ang rider ay **offline** kapag bagong bukas ang app.)

**Takbo ng test**
1. Passenger: pumili ng destination, Continue, **Confirm Booking**. Lalabas ang "Searching for a Rider...".
2. Rider: sa loob ng mga 4 segundo, lalabas ang request sa Dashboard at sa tab na **Requests**. Pindutin ang **Accept**.
3. Passenger: awtomatikong lilipat sa **"Rider found"** at makikita ang pangalan, plate, at galaw ng rider sa mapa.
4. Rider: **Arrived at Pickup** -> **Start Trip** -> **Complete Trip**.
5. Passenger: awtomatikong lilipat sa **Trip Completed**. Mag-rate ng rider.
6. Tingnan sa Supabase **Table Editor -> trips**: nandoon ang trip na may status `completed`.

**Subukan din ang mga ito:**
- Walang rider na online -> pagkatapos ng ~90 segundo: "No riders available right now".
- Passenger cancel habang naghahanap o habang papunta ang rider.
- Rider cancel habang papunta (babalik sa searching ang pasahero).
- Isara ang app sa gitna ng trip at buksan ulit (ibabalik ka sa trip).
- Dalawang rider na sabay mag-accept (isa lang ang makakakuha).

## 5. Mga setting (sa Table Editor -> `fare_settings`)

| Setting | Ibig sabihin | Ngayon |
|---|---|---|
| `base_fare`, `per_km`, `min_fare`, `rounding` | Formula ng fare: `base + (km x per_km)`, i-round, hindi bababa sa `min_fare` | 15 / 1.60 / 15 / nearest peso |
| `commission_rate` | Parte ng RideOn | 0.10 (10%) |
| `request_timeout_sec` | Ilang segundo maghahanap ng rider | 90 |
| `dispatch_radius_km` | Ang riders lang na ganito kalapit ang makakakita ng request. **0 = walang limit** | **0** |

> **Mahalaga:** Habang nagte-test ka mula sa malayo (halimbawa nasa Davao ka, pero Bunawan ang mapa),
> panatilihing `0` ang `dispatch_radius_km`. Bago ang **totoong launch**, ilagay ito sa mga `5`
> para ang malalapit na rider lang ang makakita ng request.

## 6. Ano ang ginagawa ng bawat file

| File | Ginagawa |
|---|---|
| `supabase/matching.sql` | Ang mga table, rules at function ng matching (puso ng sistema) |
| `src/services/api.js` | Mga tawag ng app sa mga function na iyon |
| `src/services/fare.js` | Estimate ng fare sa phone (ang server pa rin ang opisyal) |
| `src/context/BookingContext.js` | Passenger: nagtatanong sa server tungkol sa trip bawat 3 segundo |
| `src/context/RiderContext.js` | Rider: nagpapadala ng lokasyon, kumukuha ng requests, nag-a-accept |
| `src/screens/passenger/*` | Sumusunod na sa status galing sa server |
| `src/screens/rider/*` | Mga button ay tumatawag na sa server at nagpapakita ng error kapag tinanggihan |

## 7. Mga limitasyon (alam mo dapat)

- **Walang push notification.** Kailangang bukas ang rider app para makakita ng request. Kapag naka-lock ang screen o nasa background, hindi darating ang request. (Susunod na dapat gawin.)
- **Walang background location.** Humihinto ang pag-update ng lokasyon kapag naka-background ang app.
- **Polling:** may delay na 3 hanggang 4 segundo sa pagitan ng dalawang phone.
- **ETA ay estimate lang** (tuwid na linya ng distansya, 20 km/h).
- **Wallet top-up** ay libre pa rin (walang payment provider). I-lock ito bago ang totoong users: tingnan ang dulo ng `matching.sql`.
- **Hindi pa natest sa totoong Supabase project at totoong phone ng gumawa nito.** Natest ang database sa lokal na Postgres (lahat ng function, ang karera ng dalawang riders, at mga pagtatangkang mandaya), at nagko-compile ang app. Maaaring may maliliit na isyu sa layout o timing na lalabas lang sa totoong device.
