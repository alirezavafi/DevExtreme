import Component from '../common/component';
import { Deferred } from '../../../core/utils/deferred';
import { Option } from '../common/types';
import type { ScrollView } from '../../ui/scroll_view/scroll_view';

export class ScrollViewWrapper extends Component {
  update(): unknown {
    (this.viewRef as ScrollView)?.updateHandler();
    return Deferred().resolve();
  }

  // TODO: the public method in component override this method
  // waits for generator squad. Need to pass.
  release(preventScrollBottom: boolean): unknown {
    (this.viewRef as ScrollView).release(preventScrollBottom);
    return Deferred().resolve();
  }

  isRenovated(): boolean {
    return !!Component.IS_RENOVATED_WIDGET;
  }

  _dimensionChanged(): void {
    (this.viewRef as ScrollView)?.updateHandler();
  }

  _optionChanged(option: Option): void {
    const { name } = option;
    if (name === 'useNative') {
      this._isNodeReplaced = false;
    }
    super._optionChanged(option);
  }
}
