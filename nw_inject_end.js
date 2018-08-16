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
	
	requirejs(["tw.ace33022.util.DateTimeUtils", "tw.ace33022.util.browser.FormUtils", "moment", "firebase", "leaflet.EasyButton", "sprintfjs"], function(DateTimeUtils, FormUtils, moment, firebase) {

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

							jQuery('#' + modalId).on('hidden.bs.modal', function() { jQuery(this).remove(); });

							jQuery('#' + modalId).modal('show');
						}
					});
				}
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
						stateName: "zoom-to-default-position",        // name the state
						icon: "fa-home",
						title: "zoom to default position",
						onClick: function(btn, map) {
					
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
				
							function insertEvent() {
						
								var modalId = 'modal' + Math.random().toString(36).substr(2, 6);
								var inpTitleId = 'inpTitle' + Math.random().toString(36).substr(2, 6);
								var inpAddressId = 'inpAddress' + Math.random().toString(36).substr(2, 6);
								var inpLatId = 'inpLat' + Math.random().toString(36).substr(2, 6);
								var inpLngId = 'inpLng' + Math.random().toString(36).substr(2, 6);
								var inpIntroductionId = 'inpIntroduction' + Math.random().toString(36).substr(2, 6);
								var inpPictureUrlId = 'inpPictureUrl' + Math.random().toString(36).substr(2, 6);
								var inpStreamUrlId = 'inpStreamUrl' + Math.random().toString(36).substr(2, 6);
								var inpUrlId = 'inpUrl' + Math.random().toString(36).substr(2, 6);
								var inpBeginDateId = 'inpBeginDate' + Math.random().toString(36).substr(2, 6);
								var inpBeginTimeId = 'inpBeginTime' + Math.random().toString(36).substr(2, 6);
								var inpEndDateId = 'inpEndDate' + Math.random().toString(36).substr(2, 6);
								var inpEndTimeId = 'inpEndTime' + Math.random().toString(36).substr(2, 6);
								var btnConfirmId = 'btnConfirm' + Math.random().toString(36).substr(2, 6);
								var btnMinimizeId = 'btnMinimize' + Math.random().toString(36).substr(2, 6);
							
								var tag;
								var baseModal, modalHeader, modalBody, modalFooter;
								
								var divMinMax = jQuery('<div></div>');
								
								var marker;
								
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
										+ '  <h4 class="modal-title">新增活動資料</h4>'
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
										+ '        <label for="' + inpIntroductionId + '" class="control-label">介紹</label>'
										+ '        <input type="text" id="' + inpIntroductionId + '" class="form-control">'
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
										+ '        <label for="' + inpStreamUrlId + '" class="control-label">直播網址</label>'
										+ '        <input type="text" id="' + inpStreamUrlId + '" class="form-control">'
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
										+ '        <label class="control-label">活動時間</label>'
										+ '        <input type="date" id="' + inpBeginDateId + '" class="form-control">'
										+ '        <input type="time" id="' + inpBeginTimeId + '" class="form-control" step="1800">'
										+ '        <input type="date" id="' + inpEndDateId + '" class="form-control">'
										+ '        <input type="time" id="' + inpEndTimeId + '" class="form-control" step="1800">'
										+ '      <div>'
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
									
									var beginDateTime = moment(jQuery('#' + inpBeginDateId).val() + ' ' + jQuery('#' + inpBeginTimeId).val()).toDate();
									var endDateTime = moment(jQuery('#' + inpEndDateId).val() + ' ' + jQuery('#' + inpEndTimeId).val()).toDate();
									
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
								
								jQuery('#' + inpAddressId).on('change', function(event) { 
								
									var searchUrl = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?outSr=4326&forStorage=false&outFields=*&maxLocations=5&f=json&singleLine=' + encodeURI(jQuery(this).val());
								
									jQuery.getJSON(searchUrl, function(data) {
								
										jQuery('#' + inpLatId).val(data["candidates"][0]["location"]["y"]);
										jQuery('#' + inpLngId).val(data["candidates"][0]["location"]["x"]);
									});
								});
		
								jQuery('#' + modalId).on('shown.bs.modal', function() { 
							
									var now = new Date();
									var nowAdd30Minute = moment(now).add(30, 'minutes');
									
									btn.disable();
								
									jQuery('#' + inpTitleId).val('');
									jQuery('#' + inpAddressId).val('');
									jQuery('#' + inpUrlId).val('');

									jQuery('#' + inpBeginDateId).val(moment(now).format('YYYY-MM-DD'));
									jQuery('#' + inpEndDateId).val(moment(now).format('YYYY-MM-DD'));

									jQuery('#' + inpBeginTimeId).val(moment(now).format('HH') + ':' + sprintf('%02d', Math.floor(moment(now).format('mm') / 30) * 30));
									jQuery('#' + inpEndTimeId).val(moment(nowAdd30Minute).format('HH') + ':' + sprintf('%02d', Math.floor(moment(nowAdd30Minute).format('mm') / 30) * 30));
								
									jQuery('#' + inpTitleId).focus();
								});
							
								jQuery('#' + modalId).on('hidden.bs.modal', function() { 
								
									btn.enable();
									
									divMinMax.remove();
									
									jQuery(this).remove();
								});
							
								jQuery('#' + btnConfirmId).on('click', function(event) {
							
									var eventData = {
						
										"title": jQuery('#' + inpTitleId).val(),
										"address": jQuery('#' + inpAddressId).val(),
										"introduction": jQuery('#' + inpIntroductionId).val(),
										"picture_url": jQuery('#' + inpPictureUrlId).val(),
										"stream_url": jQuery('#' + inpStreamUrlId).val(),
										"url": jQuery('#' + inpUrlId).val(),
										"lat": jQuery('#' + inpLatId).val(),
										"lng": jQuery('#' + inpLngId).val(),
										"begin_date": moment(jQuery('#' + inpBeginDateId).val() + ' ' + jQuery('#' + inpBeginTimeId).val()).format('YYYYMMDD'),
										"begin_time": moment(jQuery('#' + inpBeginDateId).val() + ' ' + jQuery('#' + inpBeginTimeId).val()).format('HHmm'),
										"end_date": moment(jQuery('#' + inpEndDateId).val() + ' ' + jQuery('#' + inpEndTimeId).val()).format('YYYYMMDD'),
										"end_time": moment(jQuery('#' + inpEndDateId).val() + ' ' + jQuery('#' + inpEndTimeId).val()).format('HHmm')
									};
									
									var eventsPath = 'events' + '/' + moment(DateTimeUtils.doDateTimeStringToDateTime(eventData["begin_date"] + eventData["begin_time"] + '00')).format('YYYY/MM/DD');
									var newEventRef = firebase.database().ref(eventsPath).push();

									newEventRef.set(eventData, function() {
						
										jQuery('#' + modalId).modal('hide');
									});
								});
								
								jQuery('.modal-backdrop').css({
									
									"display": "none"
								});
									
								jQuery('#' + modalId).modal({backdrop: false, keyboard: false});

								jQuery('#' + modalId).modal('show');
							}
						
							/*
							if (firebase.auth().currentUser) {

								// User is signed in.
								// jQuery('#modalInsertActivity').modal('show');
							}
							else {

								// No user is signed in.
								// doLogin(new firebase.auth.GoogleAuthProvider(), function() {jQuery('#modalInsertActivity').modal('show');});
						
								// onAuthStateChanged
								firebase.auth()
								.signInWithPopup(new firebase.auth.GoogleAuthProvider())
								.then(function(result) {

									var token = result.credential.accessToken;  // This gives you a Google Access Token. You can use it to access the Google API.
									var user = result.user;                      // The signed-in user info.

									user.providerData.forEach(function(profile) {

										// console.log("Sign-in provider: " + profile.providerId);
										// console.log("  Provider-specific UID: " + profile.uid);
										// console.log("  Name: " + profile.displayName);
										// console.log("  Email: " + profile.email);
										// console.log("  Photo URL: " + profile.photoURL);
									});

									// if (typeof callback === 'function') callback(result);
								})
								.catch(function(error) {

									// Handle Errors here.
									var errorCode = error.code;
									var errorMessage = error.message;
							
									var email = error.email;	// The email of the user's account used.
									var credential = error.credential;	// The firebase.auth.AuthCredential type that was used.
								});
							}
							*/
						
							insertEvent();
						}
					}
				]
			});
			
			var easySuggestButton = L.easyButton({

				states: [
					{
						stateName: "suggest",
						icon: "fa-user",
						title: "give me suggest",
						onClick: function(btn, map) {
					
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
			
			easyAddNewEventButton.addTo(map);
			
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
		});
	});	
});