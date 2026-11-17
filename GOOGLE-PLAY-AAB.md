# Google Play AAB build

`build-aab.bat` pagamina pasirasyta `android/app/build/outputs/bundle/release/app-release.aab` (local-first rezimas).

## Vienkartinis paruosimas: pasirasymo raktas

PowerShell, `ravenof-portal` aplanke:

```powershell
& "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore android\ravenof-upload.jks -alias ravenof-upload -keyalg RSA -keysize 2048 -validity 10000
```

Komanda paklaus slaptazodzio (du kartus) ir vardo / organizacijos. Tada sukurk faila `android\keystore.properties`:

```
storeFile=ravenof-upload.jks
storePassword=TAVO_SLAPTAZODIS
keyAlias=ravenof-upload
keyPassword=TAVO_SLAPTAZODIS
```

Abu failai yra `.gitignore` - i git nepatenka. PASIDARYK ju kopija saugioje vietoje: pametus rakta, atnaujinimus teks derinti su Google pagalba.

## Build

```powershell
.\build-aab.bat
Get-Content .\build-aab.log -Tail 30
```

## Kodel asset pack

Zaidimo failai uzima apie 270 MB, o Google Play bazini moduli riboja 200 MB. Todel `media`, `cards`, `sounds` ir `rules`
aplankai AAB build'o metu perkeliami i install-time asset pack'a `media_pack`. Zaidejui jie atsisiuncia kartu su
programele ir pasiekiami tuo paciu keliu, tad zaidimo kode nieko keisti nereikia. APK build'as (`build-apk-local.bat`) lieka kaip buves.
