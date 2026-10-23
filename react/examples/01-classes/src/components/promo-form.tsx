import { Component, type ChangeEvent, type ReactNode, type SubmitEvent } from 'react';
import { formatPrice, isPromoApplicable, type Promo } from '../domain';

export type PromoResult = { ok: true; promo: Promo } | { ok: false; message: string };

interface PromoFormProps {
  promo: Promo | null;
  subtotal: number;
  onApply: (code: string) => Promise<PromoResult>;
  onClear: () => void;
}

interface PromoFormState {
  code: string;
  checking: boolean;
  error: string | null;
}

/** Управляемое поле плюс состояние запроса; сам примененный промокод живет в состоянии приложения. */
export class PromoForm extends Component<PromoFormProps, PromoFormState> {
  override state: Readonly<PromoFormState> = { code: '', checking: false, error: null };

  /** Защита от setState после размонтирования: запрос может завершиться, когда формы уже нет. */
  private mounted = false;

  override componentDidMount(): void {
    this.mounted = true;
  }

  override componentWillUnmount(): void {
    this.mounted = false;
  }

  handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ code: event.target.value, error: null });
  };

  handleSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedCode = this.state.code.trim();

    if (trimmedCode === '') {
      return;
    }

    this.setState({ checking: true, error: null });
    const applyResult = await this.props.onApply(trimmedCode);

    if (!this.mounted) {
      return;
    }

    if (applyResult.ok) {
      this.setState({ checking: false, code: '' });
    } else {
      this.setState({ checking: false, error: applyResult.message });
    }
  };

  renderApplied(promo: Promo): ReactNode {
    const isApplicable = isPromoApplicable(promo, this.props.subtotal);

    return (
      <>
        <p className={isApplicable ? 'message message_success' : 'message'} role="status">
          {isApplicable
            ? `Промокод ${promo.code} применен`
            : `Промокод ${promo.code} действует от ${formatPrice(promo.minSubtotal)}`}
        </p>
        <button
          type="button"
          className="button button_ghost button_small"
          onClick={this.props.onClear}
        >
          Убрать промокод
        </button>
      </>
    );
  }

  override render(): ReactNode {
    const { promo } = this.props;
    const { code, checking, error } = this.state;

    return (
      <form className="promo-form" onSubmit={this.handleSubmit} aria-labelledby="promo-title">
        <h3 className="promo-form__title" id="promo-title">
          Промокод
        </h3>
        {promo !== null ? (
          this.renderApplied(promo)
        ) : (
          <>
            <div className="promo-form__row">
              <input
                type="text"
                className="promo-form__input input"
                placeholder="Например, SALE10"
                aria-label="Введите промокод"
                value={code}
                disabled={checking}
                onChange={this.handleChange}
              />
              <button
                type="submit"
                className="promo-form__button button"
                disabled={checking || code.trim() === ''}
              >
                {checking ? 'Проверяем…' : 'Применить'}
              </button>
            </div>
            {error !== null && (
              <p className="message message_error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </form>
    );
  }
}
