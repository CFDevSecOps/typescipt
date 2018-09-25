import { TranslateService } from '@ngx-translate/core'
import { ChallengeService } from './../Services/challenge.service'
import { ConfigurationService } from './../Services/configuration.service'
import { Component, OnInit, NgZone, ChangeDetectorRef, Injectable } from '@angular/core'

import { SocketIo } from 'ng-io'
import { CookieService } from 'ngx-cookie'
import { CountryMappingService } from 'src/app/Services/country-mapping.service'

import fontawesome from '@fortawesome/fontawesome'
import { faGlobe, faFlagCheckered, faClipboard } from '@fortawesome/fontawesome-free-solid'
fontawesome.library.add(faGlobe, faFlagCheckered, faClipboard)

@Injectable()
@Component({
  selector: 'app-challenge-solved-notification',
  templateUrl: './challenge-solved-notification.component.html',
  styleUrls: ['./challenge-solved-notification.component.scss']
})
export class ChallengeSolvedNotificationComponent implements OnInit {

  public notifications: any[] = []
  public showCtfFlagsInNotifications
  public showCtfCountryDetailsInNotifications
  public countryMap
  constructor (private ngZone: NgZone, private configurationService: ConfigurationService, private challengeService: ChallengeService,private countryMappingService: CountryMappingService,private translate: TranslateService, private cookieService: CookieService, private ref: ChangeDetectorRef, private socket: SocketIo) {

  }

  ngOnInit () {
    this.ngZone.runOutsideAngular(() => {
      this.socket.on('challenge solved', (data) => {
        if (data && data.challenge) {
          if (!data.hidden) {
            this.showNotification(data)
          }
          if (!data.isRestore) {
            this.saveProgress()
          }
          this.socket.emit('notification received', data.flag)
        }
      })
    })

    this.configurationService.getApplicationConfiguration().subscribe((config) => {
      if (config && config.ctf) {
        if (config.ctf.showFlagsInNotifications !== null) {
          this.showCtfFlagsInNotifications = config.ctf.showFlagsInNotifications
        } else {
          this.showCtfFlagsInNotifications = false
        }

        if (config.ctf.showCountryDetailsInNotifications) {
          this.showCtfCountryDetailsInNotifications = config.ctf.showCountryDetailsInNotifications

          if (config.ctf.showCountryDetailsInNotifications !== 'none') {
            this.countryMappingService.getCountryMapping().subscribe((countryMap) => {
              this.countryMap = countryMap
            },(err) => console.log(err))
          }
        } else {
          this.showCtfCountryDetailsInNotifications = 'none'
        }
      }
    })
  }

  closeNotification (index) {
    this.notifications.splice(index, 1)
    this.ref.detectChanges()
  }

  showNotification (challenge) {
    this.translate.get('CHALLENGE_SOLVED', { challenge: challenge.challenge }).toPromise().then((challengeSolved) => challengeSolved,
      (translationId) => translationId).then((message) => {
        let country
        if (this.showCtfCountryDetailsInNotifications && this.showCtfCountryDetailsInNotifications !== 'none') {
          country = this.countryMap[challenge.key]
        }
        this.notifications.push({
          message: message,
          flag: challenge.flag,
          country: country,
          copied: false
        })
        this.ref.detectChanges()
      })
  }

  saveProgress () {
    this.challengeService.continueCode().subscribe((continueCode) => {
      if (!continueCode) {
        throw (new Error('Received invalid continue code from the sever!'))
      }
      let expires = new Date()
      expires.setFullYear(expires.getFullYear() + 1)
      this.cookieService.put('continueCode', continueCode, { expires })
    },(err) => console.log(err))
  }

}