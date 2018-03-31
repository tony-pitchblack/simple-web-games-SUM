questionForm = document.getElementById('question-form')
question = document.getElementById('question')

var client = algoliasearch('HACR0YXHC8', '1b3048a418d643530317079c1faf898d');
var index = client.initIndex('dev_hashmash');

var selectedDigits = ['➀', '➁', '➂', '➃', '➄', '➅', '➆', '➇', '➈']
var unselectedDigits = ['➊', '➋', '➌', '➍', '➎', '➏', '➐', '➑', '➒']
function getDigit(digit, isSelected) {
  var digitSet = isSelected ? selectedDigits : unselectedDigits
  return digitSet[digit]
}

function search(arr, attr, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][attr] == val){
      return i
    }
  }
  return -1
}

function setCookie(cname, cvalue, exdays=90) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
}

function getVariants(baseVariants, i) {
  var variants = []
  if (i-- > 0){
    baseVariants.forEach(variant => {
      [true, false].forEach(variantPart => {
        var newVariant = variant.slice(0)
        newVariant.push(variantPart)
        variants.push(newVariant)
      });
    })
    return getVariants(variants, i)
  } else {
    return baseVariants
  }
}

Vue.component('variant', {
  template: `
  <div class="field has-addons">
    <div class="control is-expanded">
      <a class='button is-static is-fullwidth my-button special-button'>{{ name }}</a>
    </div>
    <div class="control">
      <a class="button is-danger my-button special-button" @click="$emit(\'remove\')">Удалить</a>
    </div>
  </div>
  `,

  props: [
    'name'
  ]
})

var app = new Vue({
  el: '#root',
  data: {
    showingCurrent: false,
    currentQuestions: [],
    choosedVariant: 'Ответы',
    selectedQuestion: null,
    searchQuery: '',
    foundQuestions: [],
    createStatus: null,
    crossLoading: false,
    secondMainButtonLoading: false,
    additionalButtonLoading: false,
    mainButtonLoading: false,
    leftButtonLoading: false,
    rightButtonLoading: false,
    test: 'Тест',
    newVariant: '',
    newQuestion: {
      trueVariant: null,
      variantsMarked: [],
      variants: [],
      name: '',
      type: 'Тип ответа'
    }
  },

  methods: {
    show: function (id) {
      document.getElementById(id).classList.add('is-active')
    },
    hide: function (id) {
      document.getElementById(id).classList.remove('is-active')
    },
    addNewVariant: function () {
      this.newQuestion.variants.push(this.newVariant)
      this.newVariant = ''
    },
    attachNewVariant: function () {
      this.additionalButtonLoading = true
      var newVariantsMarked = this.selectedQuestion.variantsMarked.slice(0)
      newVariantsMarked.push({
        'name': this.newVariant,
        'status': false
      })
      index.partialUpdateObject({
        variantsMarked: newVariantsMarked,
        objectID: this.selectedQuestion.objectID
      }, function (err) {
        app.additionalButtonLoading = false
        if (!err){
          app.selectedQuestion.variantsMarked = newVariantsMarked
          app.choosedVariant = app.selectedQuestion.variantsMarked.length - 1
          app.newVariant = ''
          app.createStatus = 'Успешно'
        } else {
          app.createStatus = 'Ошибка'
        }
        setTimeout(function () {
          app.createStatus = null
          app.findQuestion()
        }, 1250)
      })
    },
    resetIndex: function () {
      index = client.initIndex('dev_hashmash');
    },
    findQuestion: function () {
      this.resetIndex()
      index.search({
        query: app.searchQuery,
        facetFilters: "test:"+this.test
        },
        function searchDone(err, content) {
          if (err) throw err;
          app.foundQuestions = content.hits
        }
      )
    },
    createNewQuestion: function () {
      this.mainButtonLoading = true
      this.newQuestion.test = this.test
      if (this.newQuestion.type == 'Один вариант'){
        this.newQuestion.variants.forEach(variant => {
          this.newQuestion.variantsMarked.push({
            'name': variant,
            'status': null
          })
        })
      } else if (this.newQuestion.type == 'Несколько вариантов') {
        var variants = getVariants([ [] ], this.newQuestion.variants.length)
        for (let i = 1; i < variants.length; i++) {
          var varName = ''
          for (let j = 0; j < variants[i].length; j++) {
            varName += getDigit(j, variants[i][j])
          }
          this.newQuestion.variantsMarked.push({
            'name': varName,
            'status': null
          })
        }
      }
      index.addObject(this.newQuestion, function (err, content) {
        app.mainButtonLoading = false
        if (!err){
          app.newVariant = ''
          app.newQuestion.variants = []
          app.newQuestion.variantsMarked = []
          app.newQuestion.name = ''
          app.newQuestion.type = 'Тип ответа'
          app.createStatus = 'Успешно'
        } else {
          app.createStatus = 'Ошибка'
        }
        setTimeout(function () {
          app.createStatus = null
          app.hide('question-form')
          app.findQuestion()
        }, 1250)
      })
    },
    selectQuestion: function (index) {
      app.selectedQuestion = app.foundQuestions[index]
      var searchIndex = search(app.currentQuestions, 'objectID', app.selectedQuestion.objectID)
      if (searchIndex != -1){
        app.choosedVariant = app.currentQuestions[searchIndex]['choosedVariant']
      }
      app.show('question')
    },
    hideQuestion: function () {
      app.searchQuery = ''
      this.choosedVariant = 'Ответы'
      this.hide('question')
      app.findQuestion()
    },
    deleteTrueVariant: function () {
      this.crossLoading = true
      var newVariantsMarked = this.selectedQuestion.variantsMarked.slice(0)
      newVariantsMarked[this.selectedQuestion.trueVariant].status = this.selectedQuestion.type == 'Развернутый' ? false : null
      index.partialUpdateObject({
        trueVariant: null,
        objectID: app.selectedQuestion.objectID,
        variantsMarked: newVariantsMarked
      }, function(err, content) {
        app.crossLoading = false
        if (!err){
          app.selectedQuestion.trueVariant = null
          app.createStatus = 'Успешно'
        } else {
          app.createStatus = 'Ошибка'
        }
        setTimeout(function () {
          app.createStatus = null
        }, 1250)
      });
    },
    deleteOrRecoverQuestion: function () {
      this.mainButtonLoading = true
      if (this.selectedQuestion.deleted){
        var newQuestion = this.selectedQuestion
        delete newQuestion.deleted
        index.addObject(newQuestion, function (err, content) {
          app.mainButtonLoading = false
          if (!err){
            Vue.delete(app.selectedQuestion, 'deleted')
            app.createStatus = 'Успешно'
          } else {
            app.createStatus = 'Ошибка'
          }
          setTimeout(function () {
            app.createStatus = null
          }, 1250)
        })
      } else {
        index.deleteObject(this.selectedQuestion.objectID, function(err, content) {
          app.mainButtonLoading = false
          if (!err) {
            app.selectedQuestion.deleted = true
            this.searchQuery = ''
            app.createStatus = 'Успешно'
          } else {
            app.createStatus = 'Ошибка'
          }
          setTimeout(function () {
            app.createStatus = null
          }, 1250)
        });
      }
    },
    markTrueVariant: function () {
      this.rightButtonLoading = true
      var newVariantsMarked = this.selectedQuestion.variantsMarked.slice(0)
      if (newVariantsMarked[this.selectedQuestion.trueVariant]) {
        newVariantsMarked[this.selectedQuestion.trueVariant].status = null
      }
      newVariantsMarked[this.choosedVariant].status = true
      index.partialUpdateObject({
        trueVariant: app.choosedVariant,
        variantsMarked: newVariantsMarked,
        objectID: this.selectedQuestion.objectID
      }, function(err, content) {
        app.rightButtonLoading = false
        if (!err){
          app.createStatus = 'Успешно'
          app.selectedQuestion.variantsMarked = newVariantsMarked
          app.selectedQuestion.trueVariant = app.choosedVariant
        } else {
          app.createStatus = 'Ошибка'
        }
        app.choosedVariant = 'Ответы'
        setTimeout(function () {
          app.createStatus = null
        }, 1250)
      })
    },
    markFalseOrNullVariant: function () {
      this.leftButtonLoading = true
      var newVariantsMarked = this.selectedQuestion.variantsMarked.slice(0)
      newVariantsMarked[this.choosedVariant].status = newVariantsMarked[this.choosedVariant].status == false ? null : false
      index.partialUpdateObject({
        variantsMarked: newVariantsMarked,
        objectID: this.selectedQuestion.objectID
      }, function(err, content) {
        app.leftButtonLoading = false
        if (!err){
          app.createStatus = 'Успешно'
          app.selectedQuestion.variantsMarked = newVariantsMarked
        } else {
          app.createStatus = 'Ошибка'
        }
        setTimeout(function () {
          app.createStatus = null
        }, 1250)
      });
    },
    deleteVariant: function () {
      this.leftButtonLoading = true
      var newVariantsMarked = this.selectedQuestion.variantsMarked.slice(0)
      newVariantsMarked.splice(this.choosedVariant, 1)
      index.partialUpdateObject({
        variantsMarked: newVariantsMarked,
        objectID: this.selectedQuestion.objectID
      }, function(err, content) {
        app.leftButtonLoading = false
        if (!err){
          app.createStatus = 'Успешно'
          app.choosedVariant = 'Ответы'
          app.selectedQuestion.variantsMarked = newVariantsMarked
        } else {
          app.createStatus = 'Ошибка'
        }
        setTimeout(function () {
          app.createStatus = null
        }, 1250)
      });
    },
    addOrRemoveQuestionFromCurrentList: function () {
      var index = search(app.currentQuestions, 'objectID', app.selectedQuestion.objectID)
      if (index != -1){
        app.currentQuestions.splice(index, 1)
      } else {
        app.currentQuestions.push({
          'objectID': app.selectedQuestion.objectID,
          'choosedVariant': app.choosedVariant
        })
      }
      setCookie("currentQuestions", JSON.stringify(app.currentQuestions))
    },
    isCurrentQuestion: function (objectID) {
      return search(app.currentQuestions, 'objectID', objectID) != -1
    },
    clearCurrentQuestions: function () {
      app.currentQuestions = []
      app.hide('current-questions-warning')
      app.showingCurrent = false
      app.findQuestion()
    }
  },

  mounted: function () {
    var currentQuestions = getCookie("currentQuestions")
    if (currentQuestions != ""){
      this.currentQuestions = JSON.parse(currentQuestions)
    }
  }
})
