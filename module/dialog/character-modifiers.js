// eslint-disable-next-line no-unused-vars
import { OseActor } from '../actor/entity.js';

export class OseCharacterModifiers extends FormApplication {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes = ["ose", "dialog", "modifiers"],
    options.id = 'sheet-modifiers';
    options.template =
      'systems/ldlmde/templates/actors/dialogs/modifiers-dialog.html';
    options.width = 240;
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return `${this.object.name}: Modifiers`;
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData() {
    return {
      system: this.object.system,
      user: game.user,
    };
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
  }
}
