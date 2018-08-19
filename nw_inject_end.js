/**
 *
 * ActivityMap
 *
 * @description
 *
 * @version 2018/08/05 初始版本。
 *
 * @author ace
 *
 * @see <a href="http://requirejs.org/">RequireJS</a>
 *
 * @see <a href="https://jquery.com/">jQuery</a>
 *
 * @see <a href="http://underscorejs.org/">Underscore.js</a>
 * @see <a href="https://github.com/jashkenas/underscore">jashkenas/underscore: JavaScript's utility _ belt</a>
 * @see <a href="http://backbonejs.org/">Backbone.js</a>
 * @see <a href="https://github.com/jashkenas/backbone">jashkenas/backbone: Give your JS App some Backbone with Models, Views, Collections, and Events</a>
 * @see <a href="https://github.com/jashkenas/backbone/wiki/Tutorials%2C-blog-posts-and-example-sites">Tutorials, blog posts and example sites · jashkenas/backbone Wiki</a>
 *
 * @see <a href="https://getbootstrap.com/">Bootstrap · The most popular HTML, CSS, and JS library in the world.</a>
 *
 * @comment
 *
 * @todo
 *
 */

Configurations.loadJS(Configurations.requirejsFile, function() {

	requirejs.config(tw.ace33022.RequireJSConfig);
	
	requirejs(["tw.ace33022.util.DateTimeUtils", "tw.ace33022.util.browser.FormUtils", "moment", "firebase", "leaflet.EasyButton", "bootstrap-datetimepicker"], function(DateTimeUtils, FormUtils, moment, firebase) {

		jQuery(document).ready(function() {

			window.addEventListener('beforeunload', function(event) {

				var confirmationMessage = '確定離開' + jQuery('title')[0].text + '?';

				// event.returnValue = confirmationMessage;

				return confirmationMessage;
			});

			// 這個寫法只有在轉換瀏覽器的Tab時才有作用，轉換不同程式時則無用！？
			document.addEventListener('visibilitychange',

				function() {

					// if (!document.hidden) initInsertStatus(false);
					// console.log(document.visibilityState);
				},
				false
			);

			jQuery(window).on('focus', function(event) {});

			jQuery(window).on('blur', function(event) {});
			
			function login(callback) {
			
				if (firebase.auth().currentUser) {

					// User is signed in.
					// console.log(firebase.auth().currentUser);
					
					if (typeof callback === 'function') callback();
				}
				else {

					// No user is signed in.
					firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
					.then(function(authData) {

						var token = authData.credential.accessToken;  // This gives you a Google Access Token. You can use it to access the Google API.
						var user = authData.user;                      // The signed-in user info.
						
						easyLoginButton.disable();
						easyLogoutButton.enable();
						
						user.providerData.forEach(function(profile) {

							// console.log("Sign-in provider: " + profile.providerId);
							// console.log("  Provider-specific UID: " + profile.uid);
							// console.log("  Name: " + profile.displayName);
							// console.log("  Email: " + profile.email);
							// console.log("  Photo URL: " + profile.photoURL);
						});

						if (typeof callback === 'function') callback();
					})
					.catch(function(error) {

						// Handle Errors here.
						var errorCode = error.code;
						var errorMessage = error.message;
				
						var email = error.email;	// The email of the user's account used.
						var credential = error.credential;	// The firebase.auth.AuthCredential type that was used.
					});
				}
			}
			
			function logout(callback) {
			
				FormUtils.showConfirmMessage('確定登出系統？',
				
					function() {
				
						firebase.auth().signOut()
						.then(function() {

								// Sign-out successful.
								easyLoginButton.enable();
								easyLogoutButton.disable();
								
								if (typeof callback === 'function') callback();
							}, 
							function(error) {

								// An error happened.
								console.log(error);
							}
						);
					}
				);
			}
		
			function routineEvents(date, map) {
			
				var path = 'routine_events/week' + '/' + date.getDay();
				
				firebase.database().ref(path).once('value').then(function(dataSnapshot) {

					dataSnapshot.forEach(function(childSnapshot) {
					
						var data = childSnapshot.val();
						
						data["begin_date"] = moment(date).format('YYYYMMDD');
						data["end_date"] = moment(date).format('YYYYMMDD');
						
						if (data["end_time"] < data["begin_time"]) data["end_date"] = moment(date).add(1, 'days').format('YYYYMMDD');
						
						setMarker(data, map);
					});
				});
			}
					
			function firebaseListener(date, map) {
			
				// todo: off listener

				var path = 'events' + '/' + moment(date).format('YYYY/MM/DD');
	
				// firebase.database().ref(path).on('value', function(snapshot, prevChildKey) {
				firebase.database().ref(path).on('child_added', function(snapshot, prevChildKey) {

					// console.log(snapshot.key);
					
					setMarker(snapshot.val(), map);
				});
			}
					
			function setMarker(data, map) {

				var divIcon = L.divIcon({"iconSize": L.point(0, 0)});
			
				var effectiveMarker = false;
				
				var marker;
				var now = new Date();
			
				var beginDateTime = DateTimeUtils.doDateTimeStringToDateTime(data["begin_date"] + data["begin_time"] + '00');
				var endDateTime = DateTimeUtils.doDateTimeStringToDateTime(data["end_date"] + data["end_time"] + '00');
				
				if (beginDateTime >= now) {
					
					effectiveMarker = true;
					
					if ((beginDateTime - now) <= (60 * 60 * 1000)) {
					
						// 活動前1小時
						divIcon = L.divIcon({"iconSize": L.point(25, 25), "className": "leaflet-div-icon-will-active"});

						// 活動開始
						setTimeout(function() {

							map.removeLayer(marker);
							setMarker(data, map);
						}, (60 - now.getMinutes()) * 60 * 1000);
					}
					else {
					
						setTimeout(function() {

							map.removeLayer(marker);
							setMarker(data, map);
						}, beginDateTime - now - (60 * 60 * 1000));
					}
				}
				else if (endDateTime <= now) {
			
					// 顯示2hr內結束的活動。
					if ((now - endDateTime) <= (2 * 60 * 60 *1000)) {
					
						effectiveMarker = true;
						divIcon = L.divIcon({"iconSize": L.point(25, 25), "className": "leaflet-div-icon-actived"});
						
						// 超過則移除結束的活動。
						setTimeout(function() {

							map.removeLayer(marker);
							setMarker(data, map);
						}, (2 * 60 * 60 * 1000) - (now - endDateTime));
					}
				}
				else if (beginDateTime <= now) {
				
					// 活動中
					effectiveMarker = true;
					divIcon = L.divIcon({"iconSize": L.point(25, 25), "className": "leaflet-div-icon-activing"});
				
					// 活動結束
					setTimeout(function() {

						map.removeLayer(marker);
						setMarker(data, map);
					}, DateTimeUtils.doDateTimeStringToDateTime(data['end_date'] + data['end_time'] + '00') - now);
				}

				if (effectiveMarker == true) {
				
					marker = L.marker([data.lat, data.lng], {"icon": divIcon}).addTo(map);
			
					marker.bindTooltip('<b>' + data["title"] + '</b><br />' + '' + moment(beginDateTime).format('YYYY/MM/DD HH:mm') + '<br />' + moment(endDateTime).format('YYYY/MM/DD HH:mm'));
			
					marker.on('click', function(event) {

						var tag;
						var modalId = 'modal' + Math.random().toString(36).substr(2, 6);
						var baseModal, modalHeader, modalBody, modalFooter;

						if (jQuery('body').hasClass('modal-open') == false) {
						
							map.setView([data.lat, data.lng]);

							tag = '<div class="modal fade" style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; overflow: hidden;" tabindex="-1" role="dialog" id="' + modalId + '">'
									+ '  <div class="modal-dialog" style="position: fixed; margin: 0; width: 100%; height: 100%; padding: 0;" role="document">'
									+ '    <div class="modal-content" style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; border: 2px solid #3c7dcf; border-radius: 0; box-shadow: none;">'
									+ '    </div>'
									+ '  </div>'
									+ '</div>';
							baseModal = jQuery(tag);

							tag = '<div class="modal-header" style="position: absolute; top: 0; right: 0; left: 0; height: 50px; padding: 10px; border: 0;">'
									+ '  <h4 class="modal-title">' + data["title"] + '</h4>'
									+ '</div>';
							modalHeader = jQuery(tag);
							
							if ((typeof data["url"] !== 'undefined') && (data["url"] != '')) modalHeader.find('.modal-title').append('<a href="' + data["url"] + '" target="_blank"><span class="fa fa-home"></span></a>');
							
							baseModal.find('.modal-content').append(modalHeader);

							tag = '<div class="modal-body" style="position: absolute; top: 50px; bottom: 60px; width: 100%; overflow: auto;"></div>';
							modalBody = jQuery(tag);
							baseModal.find('.modal-content').append(modalBody);
				
							tag = '<div class="modal-footer" style="position: absolute; right: 0; bottom: 0; left: 0; height: 45px; padding: 10px;">'
									+ '  <input type="button" class="btn" data-dismiss="modal" value="關閉">'
									+ '</div>';
							modalFooter = jQuery(tag);
							baseModal.find('.modal-content').append(modalFooter);

							baseModal.appendTo('body');
				
							if ((typeof data["stream_url"] !== 'undefined') && (data["stream_url"] != '')) {
						
								modalBody.append('<iframe style="width: 100%; height: 100%;" src="' + data["stream_url"] + '?rel=0&controls=0&showinfo=0&autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>');
							}
							else if ((typeof data["picture_url"] !== 'undefined') && (data["picture_url"] != '')) {
						
								modalBody.append('<img style="width: 100%; height: 100%;" src="' + data["picture_url"] + '"></img>');
							}
							else if (typeof data["introduction"] !== 'undefined') {
							
								modalBody.append('<div style="width: 100%; height: 100%;">' + data["introduction"] + '</div>');
							}

							jQuery('#' + modalId).on('hidden.bs.modal', function() { jQuery(this).remove(); });

							jQuery('#' + modalId).modal('show');
						}
					});
				}
			}

			function checkEventData(title, btn, map, eventData, callback) {
			
				var check = true;
			
				if (eventData["title"] == '') {
				
					check = false;
				
					FormUtils.showMessage('活動名稱不可空白！', function() {
					
						showEventInputModal(title, btn, map, eventData, callback);
					});
				}
				else if ((eventData["lat"] == '') || (eventData["lat"] == 0) || (eventData["lng"] == '') || (eventData["lng"] == 0)) {
				
					check = false;
				
					FormUtils.showMessage('經緯資料不可空白！', function() {
					
						showEventInputModal(title, btn, map, eventData, callback);
					});
				}
				else if ((eventData["introduction"] == '') && (eventData["picture_url"] == '')) {
				
					check = false;
				
					FormUtils.showMessage('介紹圖網址或介紹資料至少需輸入一項！', function() {
					
						showEventInputModal(title, btn, map, eventData, callback);
					});
				}
				else if (DateTimeUtils.doDateTimeStringToDateTime(eventData["end_date"] + eventData["end_time"] + '00') <= DateTimeUtils.doDateTimeStringToDateTime(eventData["begin_date"] + eventData["begin_time"] + '00')) {
				
					check = false;
				
					FormUtils.showMessage('活動起迄時間有誤！', function() {
					
						showEventInputModal(title, btn, map, eventData, callback);
					});
				}
				else if ((DateTimeUtils.doDateTimeStringToDateTime(eventData["end_date"] + eventData["end_time"] + '00') - DateTimeUtils.doDateTimeStringToDateTime(eventData["begin_date"] + eventData["begin_time"] + '00')) >= (10 * 60 * 60 * 1000)) {
				
					check = false;
				
					FormUtils.showMessage('活動起迄時間超過10小時！', function() {
					
						showEventInputModal(title, btn, map, eventData, callback);
					});
				}
				
				if ((check == true) && (typeof callback === 'function')) callback(eventData);
			}
			
			function showEventInputModal(title, btn, map, eventData, callback) {
			
				var modalId = 'modal' + Math.random().toString(36).substr(2, 6);
				var inpTitleId = 'inpTitle' + Math.random().toString(36).substr(2, 6);
				var inpAddressId = 'inpAddress' + Math.random().toString(36).substr(2, 6);
				var inpLatId = 'inpLat' + Math.random().toString(36).substr(2, 6);
				var inpLngId = 'inpLng' + Math.random().toString(36).substr(2, 6);
				var inpPictureUrlId = 'inpPictureUrl' + Math.random().toString(36).substr(2, 6);
				var inpIntroductionId = 'inpIntroduction' + Math.random().toString(36).substr(2, 6);
				var inpUrlId = 'inpUrl' + Math.random().toString(36).substr(2, 6);
				var inpStreamUrlId = 'inpStreamUrl' + Math.random().toString(36).substr(2, 6);
				var dtpBeginDateTimeId = 'dtpBeginDateTime' + Math.random().toString(36).substr(2, 6);
				var dtpEndDateTimeId = 'dtpEndDateTime' + Math.random().toString(36).substr(2, 6);
				var btnConfirmId = 'btnConfirm' + Math.random().toString(36).substr(2, 6);
				var btnMinimizeId = 'btnMinimize' + Math.random().toString(36).substr(2, 6);

				var tag;
				var baseModal, modalHeader, modalBody, modalFooter;

				var divMinMax = jQuery('<div></div>');

				var marker;
				
				var clickConfirm = false;
				
				divMinMax.css({
					
					"position": "fixed",
					"height": "35x",
					"width": "30%",
					"bottom": "1px",
					"left": "1px",
					"right": "1px",
					"z-index": 9999
				});
				
				divMinMax.appendTo('body');
				
				tag = '<div id="' + modalId + '" class="modal fade" style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; overflow: hidden;" tabindex="-1" role="dialog">'
						+ '  <div class="modal-dialog" style="position: fixed; margin: 0; width: 100%; height: 100%; padding: 0;" role="document">'
						+ '    <div class="modal-content" style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; border: 2px solid #3c7dcf; border-radius: 0; box-shadow: none;">'
						+ '    </div>'
						+ '  </div>'
						+ '</div>';
				baseModal = jQuery(tag);

				tag = '<div class="modal-header" style="position: absolute; top: 0; right: 0; left: 0; height: 35px; padding: 10px; border: 0;">'
						+ '  <button type="button" id="' + btnMinimizeId + '" class="close"><i class="fa fa-minus"></i></button>'
						+ '  <h4 class="modal-title">' + title + '</h4>'
						+ '</div>';
				modalHeader = jQuery(tag);
				baseModal.find('.modal-content').append(modalHeader);

				tag = '<div class="modal-body" style="position: absolute; top: 50px; bottom: 60px; width: 100%; overflow: auto;">'
						+ '  <form class="form-horizontal" style="padding: 5px;" role="form">'
						+ '    <div class="form-group">'
						+ '      <div class="col-sm-12">'
						+ '        <label for="' + inpTitleId + '" class="control-label">名稱</label>'
						+ '        <input type="text" id="' + inpTitleId + '" class="form-control">'
						+ '      </div>'
						+ '    </div>'
						+ '    <div class="form-group">'
						+ '      <div class="col-sm-8">'
						+ '        <label for="' + inpAddressId + '" class="control-label">地址</label>'
						+ '        <input type="text" id="' + inpAddressId + '" class="form-control">'
						+ '      </div>'
						+ '      <div class="col-sm-2">'
						+ '        <label for="' + inpLatId + '" class="control-label">lat</label>'
						+ '        <input type="text" id="' + inpLatId + '" class="form-control">'
						+ '      </div>'
						+ '      <div class="col-sm-2">'
						+ '        <label for="' + inpLngId + '" class="control-label">lng</label>'
						+ '        <input type="text" id="' + inpLngId + '" class="form-control">'
						+ '      </div>'
						+ '    </div>'
						+ '    <div class="form-group">'
						+ '      <div class="col-sm-12">'
						+ '        <label for="' + inpPictureUrlId + '" class="control-label">介紹圖網址</label>'
						+ '        <input type="text" id="' + inpPictureUrlId + '" class="form-control">'
						+ '      </div>'
						+ '    </div>'
						+ '    <div class="form-group">'
						+ '      <div class="col-sm-12">'
						+ '        <label for="' + inpIntroductionId + '" class="control-label">介紹</label>'
						// + '        <input type="text" id="' + inpIntroductionId + '" class="form-control">'
						+ '          <textarea id="' + inpIntroductionId + '" rows="5" class="form-control" style="resize: none;"></textarea>'
						+ '      </div>'
						+ '    </div>'
						+ '    <div class="form-group">'
						+ '      <div class="col-sm-12">'
						+ '        <label class="control-label">活動時間(起)</label>'
						+ '        <div class="input-group date" id="' + dtpBeginDateTimeId + '">'
						+ '          <input type="text" class="form-control" readonly>'
						+ '          <span class="input-group-addon"><span class="glyphicon glyphicon-calendar"></span></span>'
						+ '        </div>'
						+ '      </div>'
						+ '    </div>'
						+ '    <div class="form-group">'
						+ '      <div class="col-sm-12">'
						+ '        <label class="control-label">活動時間(迄)</label>'
						+ '        <div class="input-group date" id="' + dtpEndDateTimeId + '">'
						+ '          <input type="text" class="form-control" readonly>'
						+ '          <span class="input-group-addon"><span class="glyphicon glyphicon-calendar"></span></span>'
						+ '        </div>'
						+ '      </div>'
						+ '    </div>'
						+ '    <div class="form-group">'
						+ '      <div class="col-sm-12">'
						+ '        <label for="' + inpUrlId + '" class="control-label">活動網址</label>'
						+ '        <input type="text" id="' + inpUrlId + '" class="form-control">'
						+ '      </div>'
						+ '    </div>'
						+ '    <div class="form-group">'
						+ '      <div class="col-sm-12">'
						+ '        <label for="' + inpStreamUrlId + '" class="control-label">直播網址</label>'
						+ '        <input type="text" id="' + inpStreamUrlId + '" class="form-control">'
						+ '      </div>'
						+ '    </div>'
						+ '  </form>'
						+ '</div>';
				modalBody = jQuery(tag);
				baseModal.find('.modal-content').append(modalBody);

				tag = '<div class="modal-footer" style="position: absolute; right: 0; bottom: 0; left: 0; height: 45px; padding: 10px;">'
						+ '  <input type="button" id="' + btnConfirmId + '" class="btn btn-primary" value="確定">'
						+ '  <input type="button" class="btn" data-dismiss="modal" value="取消">'
						+ '</div>';
				modalFooter = jQuery(tag);
				baseModal.find('.modal-content').append(modalFooter);

				baseModal.appendTo('body');
				
				jQuery('#' + btnMinimizeId).on('click', function(event) {

					var divIcon = L.divIcon({"iconSize": L.point(25, 25), "className": "leaflet-div-icon-add-event"});
					
					var beginDateTime = moment(jQuery('#' + dtpBeginDateTimeId).data("DateTimePicker").date().toDate()).toDate();
					var endDateTime = moment(jQuery('#' + dtpEndDateTimeId).data("DateTimePicker").date().toDate()).toDate();
					
					jQuery('#' + modalId).toggleClass('min');
					
					if (jQuery('#' + modalId).hasClass('min') == true) { 
					
						jQuery('#' + modalId).appendTo(divMinMax);
						
						jQuery('#' + modalId).find('i').toggleClass('fa-minus').toggleClass('fa-clone');
						
						if ((jQuery('#' + inpLatId).val() !='' ) && (jQuery('#' + inpLngId).val() != '')) {
						
							marker = L.marker([jQuery('#' + inpLatId).val(), jQuery('#' + inpLngId).val()], {"icon": divIcon}).addTo(map);
							
							marker.bindTooltip('<b>' + jQuery('#' + inpTitleId).val() + '</b><br />' + '' + moment(beginDateTime).format('YYYY/MM/DD HH:mm') + '<br />' + moment(endDateTime).format('YYYY/MM/DD HH:mm'));

							map.setView([jQuery('#' + inpLatId).val(), jQuery('#' + inpLngId).val()]);
						}
					} 
					else { 

						jQuery('#' + modalId).appendTo('body');
						
						jQuery('#' + modalId).find('i').toggleClass('fa-clone').toggleClass('fa-minus');
						
						jQuery('#' + inpTitleId).focus();
						
						if (typeof marker !== 'undefined') map.removeLayer(marker);
					}
				});
				
				jQuery('#' + inpTitleId).on('change', function(event) { 
				
					if (jQuery('#' + inpIntroductionId).val() == '') jQuery('#' + inpIntroductionId).val(jQuery('#' + inpTitleId).val());
				});
				
				jQuery('#' + inpAddressId).on('change', function(event) { 
				
					var searchUrl = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?outSr=4326&forStorage=false&outFields=*&maxLocations=5&f=json&singleLine=' + encodeURI(jQuery(this).val());
				
					jQuery.getJSON(searchUrl, function(data) {
				
						jQuery('#' + inpLatId).val(data["candidates"][0]["location"]["y"]);
						jQuery('#' + inpLngId).val(data["candidates"][0]["location"]["x"]);
					});
				});

				jQuery('#' + btnConfirmId).on('click', function(event) {
				
					clickConfirm = true;
			
					eventData = {
		
						"title": jQuery('#' + inpTitleId).val(),
						"address": jQuery('#' + inpAddressId).val(),
						"introduction": jQuery('#' + inpIntroductionId).val(),
						"picture_url": jQuery('#' + inpPictureUrlId).val(),
						"stream_url": jQuery('#' + inpStreamUrlId).val(),
						"url": jQuery('#' + inpUrlId).val(),
						"lat": Number(jQuery('#' + inpLatId).val()),
						"lng": Number(jQuery('#' + inpLngId).val()),
						"begin_date": moment(jQuery('#' + dtpBeginDateTimeId).data("DateTimePicker").date().toDate()).format('YYYYMMDD'),
						"begin_time": moment(jQuery('#' + dtpBeginDateTimeId).data("DateTimePicker").date().toDate()).format('HHmm'),
						"end_date": moment(jQuery('#' + dtpEndDateTimeId).data("DateTimePicker").date().toDate()).format('YYYYMMDD'),
						"end_time": moment(jQuery('#' + dtpEndDateTimeId).data("DateTimePicker").date().toDate()).format('HHmm')
					};
					
					jQuery('#' + modalId).modal('hide');
				});
				
				jQuery('#' + modalId).on('shown.bs.modal', function() { 
			
					btn.disable();
				
					jQuery('#' + inpTitleId).val(eventData["title"]);
					jQuery('#' + inpAddressId).val(eventData["address"]);
					jQuery('#' + inpIntroductionId).val(eventData["introduction"]);
					jQuery('#' + inpPictureUrlId).val(eventData["picture_url"]);
					jQuery('#' + inpStreamUrlId).val(eventData["stream_url"]);
					jQuery('#' + inpUrlId).val(eventData["url"]);
					
					if (typeof eventData["lat"] !== 'undefined') jQuery('#' + inpLatId).val(eventData["lat"]);
					if (typeof eventData["lng"] !== 'undefined') jQuery('#' + inpLngId).val(eventData["lng"]);
					
					jQuery('#' + dtpBeginDateTimeId).datetimepicker({

						"format": Configurations["ShowDateFormatString"] + ' ' + 'HH:mm',
						"defaultDate": moment(DateTimeUtils.doDateTimeStringToDateTime(eventData["begin_date"] + eventData["begin_time"] + '00')),
						"minDate": moment().add(-1, 'days').toDate(),
						"stepping": 30,
						"sideBySide": true,
						"showClose": true,
						"showClear": false,
						"ignoreReadonly": true
					});
					
					jQuery('#' + dtpEndDateTimeId).datetimepicker({

						"format": Configurations["ShowDateFormatString"] + ' ' + 'HH:mm',
						"defaultDate": moment(DateTimeUtils.doDateTimeStringToDateTime(eventData["end_date"] + eventData["end_time"] + '00')),
						"minDate": moment().add(-1, 'days'),
						"stepping": 30,
						"sideBySide": true,
						"showClose": true,
						"showClear": false,
						"ignoreReadonly": true
					});
					
					jQuery('#' + dtpBeginDateTimeId).on('dp.change', function(event) {
					
						jQuery('#' + dtpEndDateTimeId).data('DateTimePicker').date(event.date.add(4, 'hours'));
					})
					
					jQuery('#' + inpTitleId).focus().select();
				});
			
				jQuery('#' + modalId).on('hidden.bs.modal', function() { 
				
					btn.enable();
					
					divMinMax.remove();
					
					jQuery(this).remove();
					
					if (clickConfirm == true) checkEventData(title, btn, map, eventData, callback);
				});
			
				jQuery('.modal-backdrop').css({
					
					"display": "none"
				});
					
				jQuery('#' + modalId).modal({
				
					"backdrop": false, 
					"keyboard": false
				});

				jQuery('#' + modalId).modal('show');
			}
				
			var title = '活動地圖';
			var openDateTime = new Date();
			var map;
			var selfPosition = {	// Taipei 101
			
				"latitude": 25.0340,
				"longitude": 121.5645
			};
			
			var easyDefaultPositionButton = L.easyButton({

				states: [
					{
						"stateName": "zoom-to-default-position",        // name the state
						"title": "zoom to default position",
						"icon": "fa-home",
						"onClick": function(btn, map) {
					
							map.setView([selfPosition["latitude"], selfPosition["longitude"]], 12);
						}
					} 
				]
			});

			var easyAddNewEventButton = L.easyButton({

				"states": [
					{
						"stateName": "add-new-event",
						"title": "add new event",
						"icon": "fa-plus",
						"onClick": function(btn, map) {
				
							var now = new Date();
							
							var eventData = {
				
								"title": "目前位置",
								"address": "",
								"introduction": "",
								"picture_url": "",
								"stream_url": "",
								"url": "",
								"lat": selfPosition["latitude"],
								"lng": selfPosition["longitude"],
								"begin_date": moment(now).format('YYYYMMDD'),
								"begin_time": moment(now).format('HHmm'),
								"end_date": moment(now).add(4, 'hours').format('YYYYMMDD'),
								"end_time": moment(now).add(4, 'hours').format('HHmm')
							};
							
							login(function() {
							
								showEventInputModal('新增活動資料', btn, map, eventData, function(eventData) {
								
									var eventsPath = 'events' + '/' + moment(DateTimeUtils.doDateTimeStringToDateTime(eventData["begin_date"] + eventData["begin_time"] + '00')).format('YYYY/MM/DD');
									var usersPath = 'users' + '/' + firebase.auth().currentUser.uid;
									
									var newEventRef = firebase.database().ref(eventsPath).push();
									var usersData = {};
									
									usersData[newEventRef.key] = {
									
										"title": eventData["title"],
										"begin_date": moment(DateTimeUtils.doDateTimeStringToDateTime(eventData["begin_date"] + eventData["begin_time"] + '00')).format('YYYYMMDD'),
										"begin_time": moment(DateTimeUtils.doDateTimeStringToDateTime(eventData["begin_date"] + eventData["begin_time"] + '00')).format('HHmm')
									};
									
									// transaction?
									firebase.database().ref(usersPath).set(usersData, function() {
									
										newEventRef.set(eventData, function() {
										
											// fadeMessage('資料登錄完成‧‧‧');
										});
									});
								});
							});
						}
					}
				]
			});
			
			var easyLoginButton = L.easyButton({

				states: [
					{
						"stateName": "login",
						"icon": "fa-sign-in",
						"title": "Login",
						"onClick": function(btn, map) {
						
							login();
						}
					} 
				]
			});
			
			var easyLogoutButton = L.easyButton({

				states: [
					{
						"stateName": "logout",
						"icon": "fa-sign-out",
						"title": "Logout",
						"onClick": function(btn, map) {
						
							logout();
						}
					} 
				]
			});
			
			var easySuggestButton = L.easyButton({

				states: [
					{
						"stateName": "suggest",
						"title": "give me suggest",
						"icon": "fa-comments",
						"onClick": function(btn, map) {
					
							var modalId = 'modal' + Math.random().toString(36).substr(2, 6);
							var textCommentId = 'textComment' + Math.random().toString(36).substr(2, 6);
							var btnConfirmId = 'btnConfirm' + Math.random().toString(36).substr(2, 6);
								
							var tag;
							var baseModal, modalHeader, modalBody, modalFooter;
							
							var showRegardMessage = false;
							
							tag = '<div id="' + modalId + '" class="modal fade" tabindex="-1" role="dialog">'
									+ '  <div class="modal-dialog">'
									+ '    <div class="modal-content">'
									+ '    </div>'
									+ '  </div>'
									+ '</div>';
							baseModal = jQuery(tag);

							tag = '<div class="modal-header">'
									+ '  <h4 class="modal-title">問題回報／建議事項</h4>'
									+ '</div>';
							modalHeader = jQuery(tag);
							baseModal.find('.modal-content').append(modalHeader);

							tag = '<div class="modal-body">'
									+ '  <form class="form-horizontal" role="form">'
									+ '    <div class="form-group">'
									+ '      <div class="col-sm-12">'
									+ '        <textarea id="' + textCommentId + '" rows="5" class="form-control" style="resize: none;"></textarea>'
									+ '      </div>'
									+ '    </div>'
									+ '  </form>'
									+ '</div>';
							modalBody = jQuery(tag);
							baseModal.find('.modal-content').append(modalBody);
	
							tag = '<div class="modal-footer">'
									+ '  <input type="button" id="' + btnConfirmId + '" class="btn btn-primary" value="確定">'
									+ '  <input type="button" class="btn" data-dismiss="modal" value="取消">'
									+ '</div>';
							modalFooter = jQuery(tag);
							baseModal.find('.modal-content').append(modalFooter);

							baseModal.appendTo('body');
							
							jQuery('#' + btnConfirmId).on('click', function(event) {
							
								var ajaxSettings = {
								
									// "contentType": "application/json; charset=utf-8",
									"dataType": "json",
									"url": "https://script.google.com/macros/s/AKfycbx-VcoJNkmNvNdpUmUEPv8Yc9054NfyWOFd3qZCrqyqZ_hjDbc/exec",
									"data": jQuery('#' + textCommentId).val(),
									"type": "POST",
									"success": function(data, textStatus, jqXHR) {
									
										if (data["error_code"] == 0) {
										
											showRegardMessage = true;
											
											jQuery('#' + modalId).modal('hide');
										}
										else {
										
											// show error message
										}
									},
									"error": function(jqXHR, textStatus, errorThrown) {
									
										// show error message
									}
								};
								
								jQuery.ajax(ajaxSettings);
							});
							
							jQuery('#' + modalId).on('shown.bs.modal', function() { 
							
								jQuery('#' + textCommentId).focus();
							});
							
							jQuery('#' + modalId).on('hidden.bs.modal', function() { 
							
								jQuery(this).remove();
								
								if (showRegardMessage == true) {
								
									// flash message
								}
							});
							
							jQuery('#' + modalId).modal({keyboard: false});

							jQuery('#' + modalId).modal('show');
						}
					} 
				]
			});
			
			firebase.initializeApp({

				"apiKey": "AIzaSyBg5LJIDwF99Pg3JcwSvXKZT72XeW868N8",
				"authDomain": "activitymap.firebaseapp.com",
				"databaseURL": "https://activitymap.firebaseio.com",
				"projectId": "firebase-activitymap",
				"storageBucket": "firebase-activitymap.appspot.com",
				"messagingSenderId": "749991636936"
			});
				
			// 更新Title訊息
			setTimeout(function() {

				jQuery('title')[0].text = title + '(' + moment(new Date()).format('YYYY/MM/DD') + ')';

				setInterval(function() {

					jQuery('title')[0].text = title + '(' + moment(new Date()).format('YYYY/MM/DD') + ')';
				}, 24 * 60 * 60 * 1000);
			}, 24 * 60 * 60 * 1000 - openDateTime);

			jQuery('body').append('<div id="maparea" style="height: 100%;"></div>');

			// map = L.map('maparea').setView([selfPosition["latitude"], selfPosition["longitude"]], 12);	// initialize map(Taipei 101)
			map = L.map('maparea');

			// set map tiles source
			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {

					// attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
					maxZoom: 18
				}
			).addTo(map);
			
			easyDefaultPositionButton.addTo(map);
			
			easyDefaultPositionButton.options.states[0].onClick(easyDefaultPositionButton, map);
			
			if ((location.protocol == 'http:') || (location.protocol == 'https:')) {
			
				easyAddNewEventButton.addTo(map);
			
				easyLoginButton.addTo(map);
				easyLogoutButton.addTo(map);
				
				if (firebase.auth().currentUser) {
				
					easyLogoutButton.disable();
				}
				else {
				
					easyLoginButton.disable();
				}
			}
			
			easySuggestButton.addTo(map);

			if (typeof window.navigator.geolocation !== 'undefined') {

				window.navigator.geolocation.getCurrentPosition(

					function(position) {

						selfPosition = {
						
							"latitude": position.coords.latitude,
							"longitude": position.coords.longitude
						};
						
						// map.setView([position.coords.latitude, position.coords.longitude], 12);

						easyDefaultPositionButton.options.states[0].onClick(easyDefaultPositionButton, map);
					},
					function(positionError) {
					
						// console.log('not allow');
					}
				);
			}

			routineEvents(openDateTime, map);	// 當日資料
			
			routineEvents(moment(openDateTime).add(-1, 'days').toDate(), map);
			routineEvents(moment(openDateTime).add(1, 'days').toDate(), map);
			
			setTimeout(function() {

				routineEvents(new Date(), map);
				
				setInterval(function() { 
				
					routineEvents(new Date(), map);
				}, 24 * 60 * 60 * 1000);
			}, (new Date((moment(openDateTime).add(2, 'days').toDate()).getFullYear(), (moment(openDateTime).add(2, 'days').toDate()).getMonth(), (moment(openDateTime).add(2, 'days').toDate()).getDate())) - openDateTime);
			
			firebaseListener(openDateTime, map);	// 當日資料

			firebaseListener(moment(openDateTime).add(-1, 'days').toDate(), map);
			firebaseListener(moment(openDateTime).add(1, 'days').toDate(), map);

			setTimeout(function() {

				firebaseListener(new Date(), map);
				
				setInterval(function() { 
				
					firebaseListener(new Date(), map);
				}, 24 * 60 * 60 * 1000);
			}, (new Date((moment(openDateTime).add(2, 'days').toDate()).getFullYear(), (moment(openDateTime).add(2, 'days').toDate()).getMonth(), (moment(openDateTime).add(2, 'days').toDate()).getDate())) - openDateTime);
		});	// document ready
	});	
});